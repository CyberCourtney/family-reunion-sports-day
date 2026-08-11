import { useState, type Dispatch, type FormEvent, type SetStateAction } from "react";
import { useLogMatch } from "../../hooks/useLogMatch";
import { useSessionExpiry } from "../../hooks/useSessionExpiry";
import { useToast } from "../../hooks/useToast";
import { ApiError } from "../../lib/api";
import { ROUND_NAMES, type RoundName } from "../../types/api";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Stepper } from "../ui/Stepper";
import { TeamSelect } from "./TeamSelect";

interface TeamTally {
  runs: number;
  homeRuns: number;
  outs: number;
}

const EMPTY_TALLY: TeamTally = { runs: 0, homeRuns: 0, outs: 0 };

function TeamTallyFields({
  idPrefix,
  values,
  setValues,
}: {
  idPrefix: string;
  values: TeamTally;
  setValues: Dispatch<SetStateAction<TeamTally>>;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Stepper
        id={`${idPrefix}-runs`}
        label="Runs"
        value={values.runs}
        onIncrement={() => setValues((prev) => ({ ...prev, runs: prev.runs + 1 }))}
        onDecrement={() => setValues((prev) => ({ ...prev, runs: Math.max(0, prev.runs - 1) }))}
        onTyped={(runs) => setValues((prev) => ({ ...prev, runs }))}
      />
      <Stepper
        id={`${idPrefix}-home-runs`}
        label="Home runs"
        value={values.homeRuns}
        onIncrement={() => setValues((prev) => ({ ...prev, homeRuns: prev.homeRuns + 1 }))}
        onDecrement={() =>
          setValues((prev) => ({ ...prev, homeRuns: Math.max(0, prev.homeRuns - 1) }))
        }
        onTyped={(homeRuns) => setValues((prev) => ({ ...prev, homeRuns }))}
      />
      <Stepper
        id={`${idPrefix}-outs`}
        label="Outs"
        value={values.outs}
        onIncrement={() => setValues((prev) => ({ ...prev, outs: prev.outs + 1 }))}
        onDecrement={() => setValues((prev) => ({ ...prev, outs: Math.max(0, prev.outs - 1) }))}
        onTyped={(outs) => setValues((prev) => ({ ...prev, outs }))}
      />
    </div>
  );
}

export function LogMatchForm() {
  const [round, setRound] = useState<RoundName | "">("");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [teamA, setTeamA] = useState<TeamTally>(EMPTY_TALLY);
  const [teamB, setTeamB] = useState<TeamTally>(EMPTY_TALLY);
  const [error, setError] = useState<string | null>(null);

  const logMatch = useLogMatch();
  const handleSessionExpiry = useSessionExpiry();
  const toast = useToast();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!round) {
      setError("Round is required.");
      return;
    }
    if (teamAId && teamAId === teamBId) {
      setError("Team A and Team B must be different.");
      return;
    }

    try {
      const match = await logMatch.mutateAsync({
        round,
        teamAId,
        teamBId,
        teamARuns: teamA.runs,
        teamAHomeRuns: teamA.homeRuns,
        teamAOuts: teamA.outs,
        teamBRuns: teamB.runs,
        teamBHomeRuns: teamB.homeRuns,
        teamBOuts: teamB.outs,
      });
      toast(`🏏 Match logged — ${match.teamAScore}-${match.teamBScore}!`);
      setRound("");
      setTeamAId("");
      setTeamBId("");
      setTeamA(EMPTY_TALLY);
      setTeamB(EMPTY_TALLY);
    } catch (err) {
      if (handleSessionExpiry(err)) return;
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-10">
      <h1 className="font-display font-semibold text-xl mb-6 text-center">Log a Match</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Select
          label="Round"
          value={round}
          onChange={(e) => setRound(e.target.value as RoundName)}
          required
        >
          <option value="">Select a round…</option>
          {ROUND_NAMES.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </Select>

        <div className="flex flex-col gap-4 rounded-2xl border border-line p-4">
          <TeamSelect label="Team A" value={teamAId} onChange={setTeamAId} disabledTeamId={teamBId} required />
          <TeamTallyFields idPrefix="teamA" values={teamA} setValues={setTeamA} />
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-line p-4">
          <TeamSelect label="Team B" value={teamBId} onChange={setTeamBId} disabledTeamId={teamAId} required />
          <TeamTallyFields idPrefix="teamB" values={teamB} setValues={setTeamB} />
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}
        <Button type="submit" disabled={logMatch.isPending} className="mt-1">
          {logMatch.isPending ? "Saving…" : "Log Match"}
        </Button>
      </form>
    </div>
  );
}
