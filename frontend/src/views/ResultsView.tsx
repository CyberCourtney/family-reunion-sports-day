import { useMatches } from "../hooks/useMatches";
import { useLeagueTable } from "../hooks/useLeagueTable";
import { MatchResultCard } from "../components/results/MatchResultCard";
import { ChampionBanner } from "../components/hero/ChampionBanner";
import { StandingsSection } from "../components/league-table/StandingsSection";
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

  const standings = leagueQuery.data.table;
  const teamsById = new Map(standings.map((team) => [team.teamId, team]));
  const matches = [...matchesQuery.data.matches].reverse(); // most recent first

  // Whether the tournament is "complete" here is decided by the data
  // itself (has a Final actually been logged?), not by the homepage's
  // date-based phase - the two can disagree (results logged ahead of
  // the scheduled date, or a real event running long), and this page
  // should always reflect what's actually in the database rather than
  // waiting on the calendar.
  const champion = matches.some((match) => match.round === "Final") ? standings[0] : null;

  return (
    <div>
      {champion && <ChampionBanner championName={champion.name} championColor={champion.color} />}

      <StandingsSection
        standings={standings}
        title={champion ? "Final Results" : "Standings"}
        onRefresh={() => leagueQuery.refetch()}
        isRefreshing={leagueQuery.isFetching}
      />

      <section className="mx-auto max-w-md px-4 py-10">
        <h2 className="font-display font-semibold text-xl mb-6 text-center">Match History</h2>

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
    </div>
  );
}
