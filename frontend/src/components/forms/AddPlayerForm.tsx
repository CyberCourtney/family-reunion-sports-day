import { useState, type FormEvent } from "react";
import { useAddPlayer } from "../../hooks/useAddPlayer";
import { useSessionExpiry } from "../../hooks/useSessionExpiry";
import { useToast } from "../../hooks/useToast";
import { ApiError } from "../../lib/api";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { TeamSelect } from "./TeamSelect";

export function AddPlayerForm() {
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addPlayer = useAddPlayer();
  const handleSessionExpiry = useSessionExpiry();
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const player = await addPlayer.mutateAsync({
        name,
        teamId,
        position: position || undefined,
      });
      toast(`🎉 ${player.name} added!`);
      setName("");
      setTeamId("");
      setPosition("");
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <h1 className="font-display font-semibold text-xl mb-6 text-center">Add a Player</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <TeamSelect label="Team" value={teamId} onChange={setTeamId} required />
        <Input
          label="Position (optional)"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <Button type="submit" disabled={addPlayer.isPending} className="mt-1">
          {addPlayer.isPending ? "Adding…" : "Add Player"}
        </Button>
      </form>
    </div>
  );
}
