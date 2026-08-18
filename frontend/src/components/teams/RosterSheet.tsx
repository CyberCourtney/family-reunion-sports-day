import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { usePlayers } from "../../hooks/usePlayers";
import { getTeamColor } from "../../lib/teamColors";
import { Spinner } from "../ui/Spinner";
import type { RosterTeamRef } from "../../types/api";

interface RosterSheetProps {
  team: RosterTeamRef | null;
  onClose: () => void;
}

// Same bottom-sheet/modal pattern as LoginSheet - slides up on mobile,
// centered modal at >=768px.
export function RosterSheet({ team, onClose }: RosterSheetProps) {
  const playersQuery = usePlayers(team?.teamId ?? null);

  if (!team) return null;

  const swatch = getTeamColor(team.color);
  const players = playersQuery.data?.players ?? [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 animate-[fade-in_0.15s_ease-out]"
      />

      <div className="relative w-full md:max-w-sm bg-white rounded-t-3xl md:rounded-3xl p-6 pb-8 md:pb-6 shadow-xl animate-[sheet-up_0.2s_ease-out] md:animate-[fade-in_0.15s_ease-out] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <span
              className="h-4 w-4 rounded-full shrink-0"
              style={{ backgroundColor: swatch.hex }}
              aria-hidden="true"
            />
            <h2 className="font-display font-semibold text-lg">{team.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink-muted hover:bg-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto -mx-1 px-1">
          {playersQuery.isLoading && (
            <div className="flex justify-center py-8">
              <Spinner size={28} className="text-accent" />
            </div>
          )}

          {playersQuery.isError && (
            <p className="text-danger text-sm py-4 text-center">
              Couldn't load the roster right now.
            </p>
          )}

          {playersQuery.isSuccess && players.length === 0 && (
            <p className="text-ink-muted text-sm py-4 text-center">
              No players added yet.
            </p>
          )}

          {players.length > 0 && (
            <ul className="flex flex-col divide-y divide-line">
              {players.map((player) => (
                <li key={player.playerId} className="py-3 flex items-center justify-between gap-3">
                  <span className="font-display">{player.name}</span>
                  {player.position && (
                    <span className="text-xs text-ink-muted shrink-0">{player.position}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
