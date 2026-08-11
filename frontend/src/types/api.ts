export type TeamId = string;

export interface LeagueTableRow {
  teamId: TeamId;
  name: string;
  color: "green" | "red" | "blue" | "yellow";
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
