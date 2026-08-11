import { useMatches } from "../hooks/useMatches";
import { useLeagueTable } from "../hooks/useLeagueTable";
import { MatchResultCard } from "../components/results/MatchResultCard";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";

export function ResultsView() {
  const matchesQuery = useMatches();
  const leagueQuery = useLeagueTable();

  const isLoading = matchesQuery.isLoading || leagueQuery.isLoading;
  const isError = matchesQuery.isError || leagueQuery.isError;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size={32} className="text-accent" />
      </div>
    );
  }

  if (isError || !matchesQuery.data || !leagueQuery.data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ink-muted">Couldn't load results right now.</p>
        <Button variant="secondary" onClick={() => matchesQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const teamsById = new Map(leagueQuery.data.table.map((team) => [team.teamId, team]));
  const matches = [...matchesQuery.data.matches].reverse(); // most recent first

  return (
    <section className="mx-auto max-w-md px-4 py-10">
      <h1 className="font-display font-semibold text-xl mb-6 text-center">Results</h1>

      {matches.length === 0 ? (
        <p className="text-center text-ink-muted text-sm">
          No matches played yet — check back once the first game kicks off 🏏
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <MatchResultCard key={match.matchId} match={match} teamsById={teamsById} />
          ))}
        </div>
      )}
    </section>
  );
}
