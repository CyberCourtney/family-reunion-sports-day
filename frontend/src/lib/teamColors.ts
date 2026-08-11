// Single source of truth for team identity colours. Curated, not the raw
// CSS-named colours the backend's `color` field literally contains -
// pure yellow fails contrast on white, so it's deepened to gold here.
//
// Rule: these colours mean team identity ONLY. Never reuse one as a
// semantic UI colour (success/error/etc) - a toast rendered in green
// must never look like "the green team's toast."

export type TeamColorKey = "green" | "red" | "blue" | "yellow";

export interface TeamColorSwatch {
  hex: string;
  label: string;
}

export const TEAM_COLORS: Record<TeamColorKey, TeamColorSwatch> = {
  green: { hex: "#2F9E44", label: "Green" },
  red: { hex: "#E03131", label: "Red" },
  blue: { hex: "#1971C2", label: "Blue" },
  yellow: { hex: "#EAB308", label: "Yellow" },
};

export function getTeamColor(color: string): TeamColorSwatch {
  return TEAM_COLORS[color as TeamColorKey] ?? { hex: "#9CA3AF", label: color };
}
