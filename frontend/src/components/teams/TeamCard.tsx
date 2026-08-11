import { getTeamColor } from "../../lib/teamColors";
import { Card } from "../ui/Card";

interface TeamCardProps {
  name: string;
  color: string;
  playerCount: number;
}

export function TeamCard({ name, color, playerCount }: TeamCardProps) {
  const swatch = getTeamColor(color);

  return (
    <Card className="p-5 flex flex-col items-center gap-3 text-center">
      <span
        className="h-14 w-14 rounded-full shadow-inner"
        style={{ backgroundColor: swatch.hex }}
        aria-hidden="true"
      />
      <div>
        <p className="font-display font-semibold text-base">{name}</p>
        <p className="text-xs text-ink-muted mt-0.5">
          {playerCount} {playerCount === 1 ? "player" : "players"}
        </p>
      </div>
    </Card>
  );
}
