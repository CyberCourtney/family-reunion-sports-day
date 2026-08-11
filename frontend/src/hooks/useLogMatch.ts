import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { useAuth } from "./useAuth";
import { LEAGUE_TABLE_QUERY_KEY } from "./useLeagueTable";
import { MATCHES_QUERY_KEY } from "./useMatches";
import type { Match, RoundName, TeamId } from "../types/api";

interface LogMatchInput {
  round: RoundName;
  teamAId: TeamId;
  teamBId: TeamId;
  teamARuns: number;
  teamAHomeRuns: number;
  teamAOuts: number;
  teamBRuns: number;
  teamBHomeRuns: number;
  teamBOuts: number;
}

export function useLogMatch() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogMatchInput) =>
      apiRequest<Match>("/matches", { method: "POST", body: input, idToken: session?.idToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAGUE_TABLE_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: MATCHES_QUERY_KEY });
    },
  });
}
