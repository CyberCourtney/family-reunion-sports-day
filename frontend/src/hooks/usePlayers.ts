import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import type { PlayersResponse } from "../types/api";

// Only fetches once a teamId is known - there's no "all players" list
// view, so there's nothing to prefetch before a team is actually picked.
export function usePlayers(teamId: string | null) {
  return useQuery({
    queryKey: ["players", teamId] as const,
    queryFn: () => apiRequest<PlayersResponse>(`/players?teamId=${encodeURIComponent(teamId!)}`),
    enabled: teamId !== null,
    staleTime: 15_000,
  });
}
