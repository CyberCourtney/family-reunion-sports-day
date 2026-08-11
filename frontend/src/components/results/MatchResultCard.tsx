import type { Match, LeagueTableRow } from "../../types/api";
import { TeamBadge } from "../league-table/TeamBadge";
import { Card } from "../ui/Card";

interface MatchResultCardProps {
  match: Match;
  teamsById: Map<string, LeagueTableRow>;
}

export function MatchResultCard({ match, teamsById }: MatchResultCardProps) {
  const teamA = teamsById.get(match.teamAId);
  const teamB = teamsById.get(match.teamBId);
  const aWon = match.teamAScore > match.teamBScore;
  const bWon = match.teamBScore > match.teamAScore;

  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-ink-muted font-display font-medium mb-2">
        {match.round}
      </p>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <TeamBadge color={teamA?.color ?? ""} />
          <span className={`truncate font-display ${aWon ? "font-semibold" : "text-ink-muted"}`}>
            {teamA?.name ?? match.teamAId}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 font-display font-bold text-lg tabular-nums">
          <span className={aWon ? "" : "text-ink-muted"}>{match.teamAScore}</span>
          <span className="text-ink-muted font-normal text-sm">–</span>
          <span className={bWon ? "" : "text-ink-muted"}>{match.teamBScore}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0 flex-row-reverse text-right">
          <TeamBadge color={teamB?.color ?? ""} />
          <span className={`truncate font-display ${bWon ? "font-semibold" : "text-ink-muted"}`}>
            {teamB?.name ?? match.teamBId}
          </span>
        </div>
      </div>
    </Card>
  );
}
