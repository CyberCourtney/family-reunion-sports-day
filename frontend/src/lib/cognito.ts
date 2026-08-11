// Direct fetch to Cognito's InitiateAuth (USER_PASSWORD_AUTH) - no
// Amplify/aws-sdk bundle. The same mechanism already proven against the
// live user pool app client (public client, ALLOW_USER_PASSWORD_AUTH).

const COGNITO_REGION = import.meta.env.VITE_COGNITO_REGION;
const COGNITO_CLIENT_ID = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
const COGNITO_ENDPOINT = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;

export class CognitoAuthError extends Error {}

interface InitiateAuthResult {
  idToken: string;
}

export async function initiateAuth(email: string, password: string): Promise<InitiateAuthResult> {
  let response: Response;
  try {
    response = await fetch(COGNITO_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.InitiateAuth",
      },
      body: JSON.stringify({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: { USERNAME: email, PASSWORD: password },
      }),
    });
  } catch {
    throw new CognitoAuthError("Could not reach the login service. Check your connection.");
  }

  const data = await response.json();

  if (!response.ok || !data.AuthenticationResult) {
    throw new CognitoAuthError(data.message ?? "Check your email and password.");
  }

  return { idToken: data.AuthenticationResult.IdToken };
}
