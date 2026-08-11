import { useLeagueTable } from "../../hooks/useLeagueTable";
import { Select } from "../ui/Select";

interface TeamSelectProps {
  label: string;
  value: string;
  onChange: (teamId: string) => void;
  disabledTeamId?: string;
  required?: boolean;
}

// Shared across Add Player / Submit Match - team list is sourced from
// the same league-table data already fetched for the homepage, so no
// separate "list teams" endpoint is needed.
export function TeamSelect({ label, value, onChange, disabledTeamId, required }: TeamSelectProps) {
  const { data, isLoading } = useLeagueTable();
  const teams = data?.table ?? [];

  return (
    <Select
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      disabled={isLoading}
    >
      <option value="">{isLoading ? "Loading teams…" : "Select a team…"}</option>
      {teams.map((team) => (
        <option key={team.teamId} value={team.teamId} disabled={team.teamId === disabledTeamId}>
          {team.name}
        </option>
      ))}
    </Select>
  );
}
