import { UserCircle2, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../hooks/useToast";

export function SessionControl() {
  const { session, logout, openLoginSheet } = useAuth();
  const toast = useToast();

  if (session) {
    return (
      <button
        type="button"
        onClick={() => {
          logout();
          toast("Logged out");
        }}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-display font-medium text-ink-muted hover:border-danger hover:text-danger transition-colors"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">{session.email} · </span>
        Log out
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openLoginSheet}
      className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-display font-medium text-ink-muted hover:border-accent hover:text-accent transition-colors"
    >
      <UserCircle2 size={16} />
      Captain Login
    </button>
  );
}
