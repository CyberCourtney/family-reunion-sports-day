import { getTeamColor } from "../../lib/teamColors";

interface TeamBadgeProps {
  color: string;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  label?: string;
}

const SIZE_CLASSES = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
};

// A simple colour dot identifying a team. Deliberately not text-labelled
// here - pair with the team name separately wherever this is used.
// Pass onClick (+ label, for screen readers) to make it open something,
// e.g. a team's roster - omit both to keep it purely decorative.
export function TeamBadge({ color, size = "md", onClick, label }: TeamBadgeProps) {
  const swatch = getTeamColor(color);
  const dotClassName = `inline-block rounded-full ring-2 ring-white shadow-sm ${SIZE_CLASSES[size]}`;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`${dotClassName} focus:outline-none focus:ring-2 focus:ring-accent hover:brightness-90 transition-[filter]`}
        style={{ backgroundColor: swatch.hex }}
      />
    );
  }

  return (
    <span
      className={dotClassName}
      style={{ backgroundColor: swatch.hex }}
      aria-hidden="true"
    />
  );
}
