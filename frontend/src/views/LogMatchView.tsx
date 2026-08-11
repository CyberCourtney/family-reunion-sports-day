import { AuthGate } from "../components/auth/AuthGate";
import { LogMatchForm } from "../components/forms/LogMatchForm";

export function LogMatchView() {
  return (
    <AuthGate prompt="You must be logged in as a captain to log a match.">
      <LogMatchForm />
    </AuthGate>
  );
}
