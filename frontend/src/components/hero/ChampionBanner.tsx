import { TOURNAMENT_CONFIG } from "../../lib/tournamentConfig";
import { getTeamColor } from "../../lib/teamColors";
import { formatEventDate } from "../../lib/formatters";

interface ChampionBannerProps {
  championName: string;
  championColor: string;
}

// The payoff moment of the whole app - complete-phase hero. Champion is
// just table[0] from GET /league-table, already sorted correctly.
export function ChampionBanner({ championName, championColor }: ChampionBannerProps) {
  const swatch = getTeamColor(championColor);

  return (
    <section
      className="relative overflow-hidden text-center text-white px-4 py-14 sm:py-20"
      style={{
        background: `linear-gradient(135deg, ${swatch.hex} 0%, #1F2937 130%)`,
      }}
    >
      <div className="mx-auto max-w-2xl flex flex-col items-center">
        <span className="text-5xl sm:text-6xl" aria-hidden="true">
          🏆
        </span>
        <p className="mt-2 font-display font-semibold tracking-[0.2em] text-xs sm:text-sm text-white/80 uppercase">
          Champions
        </p>
        <h1 className="mt-2 font-display font-bold text-4xl sm:text-6xl tracking-tight drop-shadow-sm">
          {championName}
        </h1>
        <p className="mt-3 text-white/90 text-sm sm:text-lg">{TOURNAMENT_CONFIG.name}</p>
        <p className="text-white/70 text-xs sm:text-sm mt-0.5">
          {formatEventDate(TOURNAMENT_CONFIG.start)} {TOURNAMENT_CONFIG.year} Winners
        </p>
      </div>
    </section>
  );
}
