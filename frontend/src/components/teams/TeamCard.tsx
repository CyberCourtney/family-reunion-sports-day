import { getTeamColor } from "../../lib/teamColors";
import { Card } from "../ui/Card";

interface TeamCardProps {
  name: string;
  color: string;
}

export function TeamCard({ name, color }: TeamCardProps) {
  const swatch = getTeamColor(color);

  return (
    <Card className="p-5 flex flex-col items-center gap-3 text-center">
      <span
        className="h-14 w-14 rounded-full shadow-inner"
        style={{ backgroundColor: swatch.hex }}
        aria-hidden="true"
      />
      <span className="font-display font-semibold text-base">{name}</span>
    </Card>
  );
}
