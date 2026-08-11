import { TeamCard } from "./TeamCard";

interface TeamsShowcaseTeam {
  teamId: string;
  name: string;
  color: string;
}

interface TeamsShowcaseProps {
  teams: TeamsShowcaseTeam[];
}

// "Before" phase content - no roster data exists (no GET /players), so
// this shows team identity only, not players.
export function TeamsShowcase({ teams }: TeamsShowcaseProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h2 className="font-display font-semibold text-xl sm:text-2xl text-center mb-6">
        Meet the Teams
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {teams.map((team) => (
          <TeamCard key={team.teamId} name={team.name} color={team.color} />
        ))}
      </div>
    </section>
  );
}
