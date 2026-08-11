import type { LeagueTableRow } from "../../types/api";
import { getTeamColor } from "../../lib/teamColors";
import { getRankDisplay, formatRunDifference } from "../../lib/formatters";
import { Card } from "../ui/Card";

interface TeamStandingCardProps {
  team: LeagueTableRow;
  rank: number;
}

// Mobile presentation - a card stack, one per team. Run difference is
// always shown; it's too important a stat to hide for space.
export function TeamStandingCard({ team, rank }: TeamStandingCardProps) {
  const swatch = getTeamColor(team.color);

  return (
    <Card
      className="p-4 flex items-center gap-4 border-l-4"
      style={{ borderLeftColor: swatch.hex }}
    >
      <span className="font-display font-bold text-xl w-8 text-center shrink-0 tabular-nums">
        {getRankDisplay(rank)}
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-display font-semibold truncate">{team.name}</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {team.played} played · W-D-L {team.won}-{team.drawn}-{team.lost} · Run
          diff {formatRunDifference(team.runDifference)}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="font-display font-bold text-2xl tabular-nums leading-none">
          {team.points}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-ink-muted mt-0.5">
          points
        </p>
      </div>
    </Card>
  );
}
