import type { ReactNode } from "react";
import { BottomTabBar } from "./BottomTabBar";
import { TopNavBar } from "./TopNavBar";
import { SessionControl } from "./SessionControl";
import { getVisibleNavItems, type ViewId } from "../../lib/navItems";
import { useAuth } from "../../hooks/useAuth";

interface AppShellProps {
  activeView: ViewId;
  onSelectView: (view: ViewId) => void;
  children: ReactNode;
}

export function AppShell({ activeView, onSelectView, children }: AppShellProps) {
  const { session } = useAuth();
  const visibleNavItems = getVisibleNavItems(!!session);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-line">
        <div className="mx-auto max-w-5xl px-4 md:px-6 h-16 flex items-center justify-between gap-4">
          <span className="font-display font-semibold text-lg tracking-tight">
            🏆 Rounders Cup
          </span>
          <div className="flex items-center gap-4">
            <TopNavBar items={visibleNavItems} activeView={activeView} onSelect={onSelectView} />
            <SessionControl />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-20 md:pb-10">{children}</main>

      <BottomTabBar items={visibleNavItems} activeView={activeView} onSelect={onSelectView} />
    </div>
  );
}
