import { getTeamColor } from "../../lib/teamColors";

interface TeamCardProps {
  name: string;
  color: string;
  playerCount: number;
  onClick: () => void;
}

// Not <Card> - needs to be a real <button> (tap target, keyboard focus,
// screen reader semantics) rather than a styled <div>, so the card
// styling is replicated here instead of reused from the shared Card.
export function TeamCard({ name, color, playerCount, onClick }: TeamCardProps) {
  const swatch = getTeamColor(color);

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-3xl bg-white border border-line shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5 flex flex-col items-center gap-3 text-center hover:border-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
    >
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
    </button>
  );
}
