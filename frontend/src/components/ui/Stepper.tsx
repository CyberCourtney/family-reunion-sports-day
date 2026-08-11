import { Minus, Plus } from "lucide-react";

interface StepperProps {
  id: string;
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onTyped: (value: number) => void;
  min?: number;
}

// Row layout (label left, controls right) rather than a grid of
// side-by-side steppers - keeps every button/input at a proper 44px tap
// target regardless of viewport width, rather than cramming three
// steppers into one row on a 375px screen.
//
// Increment/decrement are reported as events, not computed values here -
// the caller applies them via a functional state update
// (setTeamA(prev => ...)) so rapid clicks can't race against a stale
// `value` prop from the last render.
export function Stepper({
  id,
  label,
  value,
  onIncrement,
  onDecrement,
  onTyped,
  min = 0,
}: StepperProps) {
  function handleInputChange(raw: string) {
    if (raw === "") {
      onTyped(min);
      return;
    }
    const parsed = Number(raw);
    if (!Number.isNaN(parsed)) onTyped(Math.max(min, parsed));
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="text-sm font-display font-medium text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="h-11 w-11 shrink-0 rounded-full border border-line flex items-center justify-center text-ink-muted hover:border-accent hover:text-accent active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all"
        >
          <Minus size={18} />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={min}
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          className="w-14 text-center rounded-2xl border border-line py-2.5 text-base tabular-nums focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-colors"
        />
        <button
          type="button"
          onClick={onIncrement}
          aria-label={`Increase ${label}`}
          className="h-11 w-11 shrink-0 rounded-full border border-line flex items-center justify-center text-ink-muted hover:border-accent hover:text-accent active:scale-95 transition-all"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
