import { useCallback, useState, type ReactNode } from "react";
import { initiateAuth, CognitoAuthError } from "../lib/cognito";
import { LoginSheet } from "../components/layout/LoginSheet";
import { AuthContext, type CaptainSession } from "./authContextObject";

const STORAGE_KEY = "captainSession";

function readStoredSession(): CaptainSession | null {
  const raw = sessionStorage.getItem(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as CaptainSession) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CaptainSession | null>(readStoredSession);
  const [isLoginSheetOpen, setIsLoginSheetOpen] = useState(false);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { idToken } = await initiateAuth(email, password);
      const newSession: CaptainSession = { email, idToken };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(newSession));
      setSession(newSession);
    } catch (err) {
      if (err instanceof CognitoAuthError) throw err;
      throw new CognitoAuthError("Login failed. Please try again.");
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }, []);

  const openLoginSheet = useCallback(() => setIsLoginSheetOpen(true), []);

  return (
    <AuthContext.Provider value={{ session, login, logout, openLoginSheet }}>
      {children}
      <LoginSheet isOpen={isLoginSheetOpen} onClose={() => setIsLoginSheetOpen(false)} />
    </AuthContext.Provider>
  );
}
