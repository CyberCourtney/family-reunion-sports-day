import { useMemo } from "react";
import { TOURNAMENT_CONFIG } from "../lib/tournamentConfig";
import { useNow } from "./useNow";

export type TournamentPhase = "before" | "active" | "complete";

const VALID_PHASES: TournamentPhase[] = ["before", "active", "complete"];

function getDevPhaseOverride(): TournamentPhase | null {
  if (!import.meta.env.DEV) return null;
  const value = new URLSearchParams(window.location.search).get("phase");
  return VALID_PHASES.includes(value as TournamentPhase) ? (value as TournamentPhase) : null;
}

function derivePhase(now: Date): TournamentPhase {
  if (now < TOURNAMENT_CONFIG.start) return "before";
  if (now <= TOURNAMENT_CONFIG.end) return "active";
  return "complete";
}

export function useTournamentPhase(): { phase: TournamentPhase; now: Date } {
  const now = useNow();

  const phase = useMemo(() => {
    return getDevPhaseOverride() ?? derivePhase(now);
  }, [now]);

  return { phase, now };
}
