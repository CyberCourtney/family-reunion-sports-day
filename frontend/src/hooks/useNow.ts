import { useEffect, useState } from "react";

// Shared ticking clock so the phase derivation and the countdown timer
// don't each run their own separate setInterval.
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
