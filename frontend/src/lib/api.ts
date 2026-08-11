// Single fetch wrapper every hook goes through - base URL, auth header
// attachment (raw token, no "Bearer" prefix - that's what the deployed
// API Gateway Cognito authorizer expects), typed errors. Auth attachment
// is a no-op until Phase 3 wires a real session; the shape is ready now.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  idToken?: string | null;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, idToken } = options;

  const headers: Record<string, string> = {};
  if (idToken) headers.Authorization = idToken;

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // empty/non-JSON body - fine for some responses
  }

  if (!response.ok) {
    const message =
      (data as { error?: string } | null)?.error ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message);
  }

  return data as T;
}
