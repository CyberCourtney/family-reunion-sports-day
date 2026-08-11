import { useTournamentPhase } from "../hooks/useTournamentPhase";
import { useLeagueTable } from "../hooks/useLeagueTable";
import { useMatches } from "../hooks/useMatches";
import { TournamentHero } from "../components/hero/TournamentHero";
import { ChampionBanner } from "../components/hero/ChampionBanner";
import { TeamsShowcase } from "../components/teams/TeamsShowcase";
import { TournamentBracket } from "../components/bracket/TournamentBracket";
import { StandingsSection } from "../components/league-table/StandingsSection";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";

export function HomeView() {
  const { phase, now } = useTournamentPhase();
  const leagueQuery = useLeagueTable();
  const matchesQuery = useMatches();

  const isLoading = leagueQuery.isLoading || matchesQuery.isLoading;
  const isError = leagueQuery.isError || matchesQuery.isError;

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size={32} className="text-accent" />
      </div>
    );
  }

  if (isError || !leagueQuery.data || !matchesQuery.data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ink-muted">Couldn't load the tournament right now.</p>
        <Button variant="secondary" onClick={() => leagueQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const standings = leagueQuery.data.table;
  const matches = matchesQuery.data.matches;
  const teamsById = new Map(standings.map((team) => [team.teamId, team]));
  const champion = standings[0];

  return (
    <div>
      {phase === "complete" && champion ? (
        <ChampionBanner championName={champion.name} championColor={champion.color} />
      ) : (
        <TournamentHero phase={phase === "complete" ? "active" : phase} now={now} />
      )}

      {phase === "before" && <TeamsShowcase teams={standings} />}

      {/* Shown in every phase - TBD slots before the tournament give the
          homepage something real to look forward to, not just a
          countdown. */}
      <TournamentBracket matches={matches} teamsById={teamsById} />

      {phase === "active" && (
        <StandingsSection
          standings={standings}
          title="Live Standings"
          onRefresh={() => leagueQuery.refetch()}
          isRefreshing={leagueQuery.isFetching}
        />
      )}

      {phase === "complete" && (
        <StandingsSection
          standings={standings}
          title="Final Results"
          onRefresh={() => leagueQuery.refetch()}
          isRefreshing={leagueQuery.isFetching}
        />
      )}
    </div>
  );
}
