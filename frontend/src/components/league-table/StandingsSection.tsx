import { RotateCw } from "lucide-react";
import type { LeagueTableRow } from "../../types/api";
import { StandingsTable } from "./StandingsTable";
import { TeamStandingCard } from "./TeamStandingCard";

interface StandingsSectionProps {
  standings: LeagueTableRow[];
  title: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function StandingsSection({
  standings,
  title,
  onRefresh,
  isRefreshing = false,
}: StandingsSectionProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <div className="flex items-center justify-center gap-2 mb-6">
        <h2 className="font-display font-semibold text-xl sm:text-2xl text-center">{title}</h2>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh standings"
            className="rounded-full p-1.5 text-ink-muted hover:text-accent hover:bg-surface transition-colors disabled:opacity-50"
          >
            <RotateCw size={16} className={isRefreshing ? "animate-spin" : ""} />
          </button>
        )}
      </div>

      <StandingsTable standings={standings} />

      <div className="md:hidden flex flex-col gap-3">
        {standings.map((team, index) => (
          <TeamStandingCard key={team.teamId} team={team} rank={index} />
        ))}
      </div>
    </section>
  );
}
