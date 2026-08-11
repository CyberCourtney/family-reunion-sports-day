import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { useAuth } from "./useAuth";
import { LEAGUE_TABLE_QUERY_KEY } from "./useLeagueTable";

interface LogMatchInput {
  round: string;
  teamAId: string;
  teamBId: string;
  teamARuns: number;
  teamAHomeRuns: number;
  teamAOuts: number;
  teamBRuns: number;
  teamBHomeRuns: number;
  teamBOuts: number;
}

interface Match extends LogMatchInput {
  matchId: string;
  teamAScore: number;
  teamBScore: number;
}

export function useLogMatch() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LogMatchInput) =>
      apiRequest<Match>("/matches", { method: "POST", body: input, idToken: session?.idToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAGUE_TABLE_QUERY_KEY });
    },
  });
}
