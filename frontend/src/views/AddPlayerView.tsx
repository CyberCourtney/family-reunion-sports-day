import { AuthGate } from "../components/auth/AuthGate";
import { AddPlayerForm } from "../components/forms/AddPlayerForm";

export function AddPlayerView() {
  return (
    <AuthGate prompt="You must be logged in as a captain to add a player.">
      <AddPlayerForm />
    </AuthGate>
  );
}
