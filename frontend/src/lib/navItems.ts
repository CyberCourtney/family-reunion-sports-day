import { Home, UserPlus, ClipboardList, type LucideIcon } from "lucide-react";

// Single source of truth for navigation. Adding a future tab (Team Chat,
// Photos, Tournament History, Team Management) is appending one entry
// here - BottomTabBar and TopNavBar both render off this list, nothing
// is hardcoded per-component.
export type ViewId = "home" | "add-player" | "log-match";

export interface NavItem {
  id: ViewId;
  label: string;
  icon: LucideIcon;
  requiresAuth?: boolean;
}

// Add Player / Log Match are captain-only tasks - not shown to everyone
// browsing the public homepage, only once logged in as a captain. See
// getVisibleNavItems() below.
export const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "add-player", label: "Add Player", icon: UserPlus, requiresAuth: true },
  { id: "log-match", label: "Log Match", icon: ClipboardList, requiresAuth: true },
];

export function getVisibleNavItems(isCaptainLoggedIn: boolean): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.requiresAuth || isCaptainLoggedIn);
}
