import { createContext } from "react";

export interface CaptainSession {
  email: string;
  idToken: string;
}

export interface AuthContextValue {
  session: CaptainSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  openLoginSheet: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
