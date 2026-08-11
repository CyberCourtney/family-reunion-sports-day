import { TOURNAMENT_CONFIG } from "../../lib/tournamentConfig";
import { TEAM_COLORS } from "../../lib/teamColors";
import { formatEventDate } from "../../lib/formatters";
import { CountdownTimer } from "./CountdownTimer";
import type { TournamentPhase } from "../../hooks/useTournamentPhase";

interface TournamentHeroProps {
  phase: Extract<TournamentPhase, "before" | "active">;
  now: Date;
}

const HERO_GRADIENT = `linear-gradient(120deg, ${TEAM_COLORS.blue.hex} 0%, ${TEAM_COLORS.green.hex} 33%, ${TEAM_COLORS.yellow.hex} 66%, ${TEAM_COLORS.red.hex} 100%)`;

export function TournamentHero({ phase, now }: TournamentHeroProps) {
  const isBefore = phase === "before";

  return (
    <section
      className={`relative overflow-hidden text-center text-white px-4 ${
        isBefore ? "py-14 sm:py-20" : "py-8 sm:py-10"
      }`}
      style={{ background: HERO_GRADIENT }}
    >
      <div className="relative mx-auto max-w-2xl flex flex-col items-center">
        <h1 className="font-display font-bold text-2xl sm:text-4xl tracking-tight drop-shadow-sm uppercase">
          {TOURNAMENT_CONFIG.name}
        </h1>

        {isBefore ? (
          <div className="font-display font-bold text-6xl sm:text-8xl mt-1 drop-shadow-sm">
            {TOURNAMENT_CONFIG.year}
          </div>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 font-display font-semibold text-sm sm:text-base">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            LIVE NOW
          </div>
        )}

        <p className="mt-2 font-display font-medium text-sm sm:text-base text-white/95 tracking-wide">
          {formatEventDate(TOURNAMENT_CONFIG.start)}
        </p>

        <p className="mt-3 italic text-white/90 text-sm sm:text-lg">
          {TOURNAMENT_CONFIG.tagline}
        </p>

        {isBefore && (
          <div className="mt-8">
            <CountdownTimer target={TOURNAMENT_CONFIG.start} now={now} />
          </div>
        )}
      </div>
    </section>
  );
}
