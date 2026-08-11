const MEDALS = ["🥇", "🥈", "🥉"];

export function getRankDisplay(index: number): string {
  return MEDALS[index] ?? String(index + 1);
}

export function formatRunDifference(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function formatEventDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
