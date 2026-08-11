import { useTournamentPhase } from "../hooks/useTournamentPhase";
import { useLeagueTable } from "../hooks/useLeagueTable";
import { TournamentHero } from "../components/hero/TournamentHero";
import { ChampionBanner } from "../components/hero/ChampionBanner";
import { TeamsShowcase } from "../components/teams/TeamsShowcase";
import { StandingsSection } from "../components/league-table/StandingsSection";
import { Spinner } from "../components/ui/Spinner";
import { Button } from "../components/ui/Button";

export function HomeView() {
  const { phase, now } = useTournamentPhase();
  const { data, isLoading, isError, refetch, isFetching } = useLeagueTable();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spinner size={32} className="text-accent" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-ink-muted">Couldn't load the tournament right now.</p>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const standings = data.table;
  const champion = standings[0];

  return (
    <div>
      {phase === "complete" && champion ? (
        <ChampionBanner championName={champion.name} championColor={champion.color} />
      ) : (
        <TournamentHero phase={phase === "complete" ? "active" : phase} now={now} />
      )}

      {phase === "before" && (
        <TeamsShowcase
          teams={standings.map(({ teamId, name, color }) => ({ teamId, name, color }))}
        />
      )}

      {phase === "active" && (
        <StandingsSection
          standings={standings}
          title="Live Standings"
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
      )}

      {phase === "complete" && (
        <StandingsSection
          standings={standings}
          title="Final Results"
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
        />
      )}
    </div>
  );
}
