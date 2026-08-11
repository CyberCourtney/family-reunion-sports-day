import type { NavItem, ViewId } from "../../lib/navItems";

interface BottomTabBarProps {
  items: NavItem[];
  activeView: ViewId;
  onSelect: (view: ViewId) => void;
}

export function BottomTabBar({ items, activeView, onSelect }: BottomTabBarProps) {
  // Nothing to navigate to (just Home) - no bar needed.
  if (items.length < 2) return null;

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-line flex"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary"
    >
      {items.map((item) => {
        const isActive = item.id === activeView;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-14 py-2 text-xs font-display font-medium transition-colors ${
              isActive ? "text-accent" : "text-ink-muted"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
