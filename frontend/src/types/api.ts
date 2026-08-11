export type TeamId = string;

export type RoundName = "Semi-Final 1" | "Semi-Final 2" | "Final";
export const ROUND_NAMES: RoundName[] = ["Semi-Final 1", "Semi-Final 2", "Final"];

export interface LeagueTableRow {
  teamId: TeamId;
  name: string;
  color: "green" | "red" | "blue" | "yellow";
  playerCount: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  runsFor: number;
  runsAgainst: number;
  runDifference: number;
  points: number;
}

export interface LeagueTableResponse {
  table: LeagueTableRow[];
}

export interface Match {
  matchId: string;
  submittedAt: string;
  round: RoundName;
  teamAId: TeamId;
  teamBId: TeamId;
  teamARuns: number;
  teamAHomeRuns: number;
  teamAOuts: number;
  teamAScore: number;
  teamBRuns: number;
  teamBHomeRuns: number;
  teamBOuts: number;
  teamBScore: number;
}

export interface MatchesResponse {
  matches: Match[];
}
