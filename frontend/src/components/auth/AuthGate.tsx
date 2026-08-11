import type { ReactNode } from "react";
import { LogIn } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";

interface AuthGateProps {
  children: ReactNode;
  prompt: string;
}

export function AuthGate({ children, prompt }: AuthGateProps) {
  const { session, openLoginSheet } = useAuth();

  if (!session) {
    return (
      <div className="mx-auto max-w-md px-4 pt-10">
        <Card className="p-8 text-center flex flex-col items-center gap-3">
          <LogIn className="text-accent" size={32} />
          <p className="text-ink-muted text-sm">{prompt}</p>
          <Button onClick={openLoginSheet} className="mt-1">
            Captain Login
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
