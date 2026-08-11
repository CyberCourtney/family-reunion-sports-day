import type { NavItem, ViewId } from "../../lib/navItems";

interface TopNavBarProps {
  items: NavItem[];
  activeView: ViewId;
  onSelect: (view: ViewId) => void;
}

export function TopNavBar({ items, activeView, onSelect }: TopNavBarProps) {
  if (items.length < 2) return null;

  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
      {items.map((item) => {
        const isActive = item.id === activeView;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`rounded-full px-4 py-2 font-display font-medium text-sm transition-colors ${
              isActive ? "bg-accent/10 text-accent" : "text-ink-muted hover:text-ink"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
