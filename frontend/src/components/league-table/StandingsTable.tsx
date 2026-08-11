import type { LeagueTableRow } from "../../types/api";
import { getRankDisplay, formatRunDifference } from "../../lib/formatters";
import { TeamBadge } from "./TeamBadge";

interface StandingsTableProps {
  standings: LeagueTableRow[];
}

// Desktop presentation - a real sports table, not a generic data grid.
export function StandingsTable({ standings }: StandingsTableProps) {
  return (
    <table className="hidden md:table w-full text-left border-separate border-spacing-y-2">
      <thead>
        <tr className="text-xs uppercase tracking-wider text-ink-muted">
          <th className="px-4 py-2 font-display font-medium">Pos</th>
          <th className="px-4 py-2 font-display font-medium">Team</th>
          <th className="px-4 py-2 font-display font-medium text-center">P</th>
          <th className="px-4 py-2 font-display font-medium text-center">W</th>
          <th className="px-4 py-2 font-display font-medium text-center">D</th>
          <th className="px-4 py-2 font-display font-medium text-center">L</th>
          <th className="px-4 py-2 font-display font-medium text-center">Run Diff</th>
          <th className="px-4 py-2 font-display font-medium text-center">Pts</th>
        </tr>
      </thead>
      <tbody>
        {standings.map((team, index) => (
          <tr key={team.teamId} className="bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
            <td className="px-4 py-3 rounded-l-2xl font-display font-semibold text-lg tabular-nums">
              {getRankDisplay(index)}
            </td>
            <td className="px-4 py-3 font-display font-medium">
              <div className="flex items-center gap-2.5">
                <TeamBadge color={team.color} />
                {team.name}
              </div>
            </td>
            <td className="px-4 py-3 text-center tabular-nums">{team.played}</td>
            <td className="px-4 py-3 text-center tabular-nums">{team.won}</td>
            <td className="px-4 py-3 text-center tabular-nums">{team.drawn}</td>
            <td className="px-4 py-3 text-center tabular-nums">{team.lost}</td>
            <td className="px-4 py-3 text-center tabular-nums">
              {formatRunDifference(team.runDifference)}
            </td>
            <td className="px-4 py-3 rounded-r-2xl text-center font-display font-bold tabular-nums text-lg">
              {team.points}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
