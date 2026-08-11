import type { LeagueTableRow } from "../../types/api";
import { TeamCard } from "./TeamCard";

interface TeamsShowcaseProps {
  teams: LeagueTableRow[];
}

// "Before" phase content - no roster listing (still no GET /players),
// but playerCount gives real, live content instead of 4 static circles.
export function TeamsShowcase({ teams }: TeamsShowcaseProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h2 className="font-display font-semibold text-xl sm:text-2xl text-center mb-6">
        Meet the Teams
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {teams.map((team) => (
          <TeamCard
            key={team.teamId}
            name={team.name}
            color={team.color}
            playerCount={team.playerCount}
          />
        ))}
      </div>
    </section>
  );
}
