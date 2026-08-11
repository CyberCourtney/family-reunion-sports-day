import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import { useAuth } from "./useAuth";
import { LEAGUE_TABLE_QUERY_KEY } from "./useLeagueTable";

interface AddPlayerInput {
  name: string;
  teamId: string;
  position?: string;
}

interface Player {
  playerId: string;
  name: string;
  teamId: string;
  position: string | null;
}

export function useAddPlayer() {
  const { session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddPlayerInput) =>
      apiRequest<Player>("/players", { method: "POST", body: input, idToken: session?.idToken }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEAGUE_TABLE_QUERY_KEY });
    },
  });
}
