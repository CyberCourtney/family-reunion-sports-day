import { ChevronDown, Trophy } from "lucide-react";
import { BracketMatchCard, type BracketSlotTeam } from "./BracketMatchCard";
import type { Match, LeagueTableRow, RosterTeamRef } from "../../types/api";

interface TournamentBracketProps {
  matches: Match[];
  teamsById: Map<string, LeagueTableRow>;
  onSelectTeam: (team: RosterTeamRef) => void;
}

function getWinnerId(match: Match | undefined): string | undefined {
  if (!match) return undefined;
  if (match.teamAScore > match.teamBScore) return match.teamAId;
  if (match.teamBScore > match.teamAScore) return match.teamBId;
  return undefined; // draw - no winner to advance; real-world tie-break happens off-app
}

function toSlot(
  teamId: string | undefined,
  teamsById: Map<string, LeagueTableRow>,
  score: number | undefined,
  isWinner: boolean,
): BracketSlotTeam {
  if (!teamId) return { name: "TBD" };
  const team = teamsById.get(teamId);
  return { name: team?.name ?? teamId, teamId, color: team?.color, score, isWinner };
}

// Deliberately a vertical stack, not a literal branching diagram -
// reads clearly on a 375px phone, which a true bracket with connecting
// lines doesn't. The semis' real teams are only known once each is
// actually played (there's no seeding data); the Final preview-fills
// with the semi winners once they're known, then switches to the
// Final's own real recorded result once that match is played too.
export function TournamentBracket({ matches, teamsById, onSelectTeam }: TournamentBracketProps) {
  const sf1 = matches.find((m) => m.round === "Semi-Final 1");
  const sf2 = matches.find((m) => m.round === "Semi-Final 2");
  const final = matches.find((m) => m.round === "Final");

  const sf1WinnerId = getWinnerId(sf1);
  const sf2WinnerId = getWinnerId(sf2);
  const finalWinnerId = getWinnerId(final);

  const finalTeamAId = final?.teamAId ?? sf1WinnerId;
  const finalTeamBId = final?.teamBId ?? sf2WinnerId;

  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <h2 className="font-display font-semibold text-xl sm:text-2xl text-center mb-6">
        Tournament Bracket
      </h2>

      <div className="flex flex-col items-center gap-3">
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
          <BracketMatchCard
            roundLabel="Semi-Final 1"
            teamA={toSlot(sf1?.teamAId, teamsById, sf1?.teamAScore, sf1WinnerId === sf1?.teamAId)}
            teamB={toSlot(sf1?.teamBId, teamsById, sf1?.teamBScore, sf1WinnerId === sf1?.teamBId)}
            onSelectTeam={onSelectTeam}
          />
          <BracketMatchCard
            roundLabel="Semi-Final 2"
            teamA={toSlot(sf2?.teamAId, teamsById, sf2?.teamAScore, sf2WinnerId === sf2?.teamAId)}
            teamB={toSlot(sf2?.teamBId, teamsById, sf2?.teamBScore, sf2WinnerId === sf2?.teamBId)}
            onSelectTeam={onSelectTeam}
          />
        </div>

        <ChevronDown className="text-ink-muted" size={20} aria-hidden="true" />

        <div className="w-full sm:w-1/2">
          <BracketMatchCard
            roundLabel="Final"
            teamA={toSlot(finalTeamAId, teamsById, final?.teamAScore, finalWinnerId === finalTeamAId)}
            teamB={toSlot(finalTeamBId, teamsById, final?.teamBScore, finalWinnerId === finalTeamBId)}
            emphasized
            onSelectTeam={onSelectTeam}
          />
        </div>

        {finalWinnerId && (
          <p className="flex items-center gap-1.5 text-sm font-display font-medium text-ink-muted mt-1">
            <Trophy size={16} className="text-accent" />
            {teamsById.get(finalWinnerId)?.name} win it all!
          </p>
        )}
      </div>
    </section>
  );
}
