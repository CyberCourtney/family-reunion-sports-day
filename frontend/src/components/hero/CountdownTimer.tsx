interface CountdownTimerProps {
  target: Date;
  now: Date;
}

interface TimeUnit {
  label: string;
  value: number;
}

function getTimeRemaining(target: Date, now: Date): TimeUnit[] {
  const diffMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [
    { label: "Days", value: days },
    { label: "Hours", value: hours },
    { label: "Minutes", value: minutes },
    { label: "Seconds", value: seconds },
  ];
}

export function CountdownTimer({ target, now }: CountdownTimerProps) {
  const units = getTimeRemaining(target, now);

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {units.map((unit) => (
        <div
          key={unit.label}
          className="flex flex-col items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm px-3 py-2.5 sm:px-5 sm:py-3.5 min-w-[64px] sm:min-w-[84px]"
        >
          <span className="font-display font-semibold text-2xl sm:text-4xl tabular-nums text-white">
            {unit.value}
          </span>
          <span className="text-[10px] sm:text-xs uppercase tracking-wider text-white/80 font-medium">
            {unit.label}
          </span>
        </div>
      ))}
    </div>
  );
}
