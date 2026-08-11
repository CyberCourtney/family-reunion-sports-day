import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../lib/api";
import type { MatchesResponse } from "../types/api";

export const MATCHES_QUERY_KEY = ["matches"] as const;

export function useMatches() {
  return useQuery({
    queryKey: MATCHES_QUERY_KEY,
    queryFn: () => apiRequest<MatchesResponse>("/matches"),
    staleTime: 15_000,
  });
}
