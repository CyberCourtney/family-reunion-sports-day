import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import type { LeagueTableResponse } from "../types/api";

export const LEAGUE_TABLE_QUERY_KEY = ["league-table"] as const;

export function useLeagueTable() {
  return useQuery({
    queryKey: LEAGUE_TABLE_QUERY_KEY,
    queryFn: () => apiRequest<LeagueTableResponse>("/league-table"),
    staleTime: 15_000,
  });
}
