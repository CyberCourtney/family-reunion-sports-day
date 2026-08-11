import { Card } from "../ui/Card";
import { TeamBadge } from "../league-table/TeamBadge";

export interface BracketSlotTeam {
  name: string;
  color?: string;
  score?: number;
  isWinner?: boolean;
}

interface BracketMatchCardProps {
  roundLabel: string;
  teamA: BracketSlotTeam;
  teamB: BracketSlotTeam;
  emphasized?: boolean;
}

function SlotRow({ team, align }: { team: BracketSlotTeam; align: "left" | "right" }) {
  const isTbd = !team.color;
  return (
    <div
      className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      {isTbd ? (
        <span className="h-4 w-4 rounded-full border-2 border-dashed border-line shrink-0" />
      ) : (
        <TeamBadge color={team.color!} />
      )}
      <span
        className={`truncate font-display ${
          isTbd ? "text-ink-muted italic" : team.isWinner ? "font-semibold" : "text-ink-muted"
        }`}
      >
        {team.name}
      </span>
      {team.score !== undefined && (
        <span className="ml-auto font-display font-bold tabular-nums">{team.score}</span>
      )}
    </div>
  );
}

export function BracketMatchCard({ roundLabel, teamA, teamB, emphasized }: BracketMatchCardProps) {
  return (
    <Card
      className={`p-4 flex flex-col gap-2.5 ${emphasized ? "border-accent border-2" : ""}`}
    >
      <p className="text-xs uppercase tracking-wide text-ink-muted font-display font-medium">
        {roundLabel}
      </p>
      <SlotRow team={teamA} align="left" />
      <SlotRow team={teamB} align="left" />
    </Card>
  );
}
