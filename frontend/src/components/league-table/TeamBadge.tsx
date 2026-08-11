import { getTeamColor } from "../../lib/teamColors";

interface TeamBadgeProps {
  color: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLASSES = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

// A simple colour dot identifying a team. Deliberately not text-labelled
// here - pair with the team name separately wherever this is used.
export function TeamBadge({ color, size = "md" }: TeamBadgeProps) {
  const swatch = getTeamColor(color);
  return (
    <span
      className={`inline-block rounded-full ring-2 ring-white shadow-sm ${SIZE_CLASSES[size]}`}
      style={{ backgroundColor: swatch.hex }}
      aria-hidden="true"
    />
  );
}
