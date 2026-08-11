import { useEffect, useState } from "react";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import { AppShell } from "./components/layout/AppShell";
import { HomeView } from "./views/HomeView";
import { ResultsView } from "./views/ResultsView";
import { AddPlayerView } from "./views/AddPlayerView";
import { LogMatchView } from "./views/LogMatchView";
import { NAV_ITEMS, type ViewId } from "./lib/navItems";

// No router (see plan §5): all views behave as tabs, not deep-linkable
// pages, so plain state avoids needing CloudFront SPA-fallback config.
function renderView(view: ViewId) {
  switch (view) {
    case "home":
      return <HomeView />;
    case "results":
      return <ResultsView />;
    case "add-player":
      return <AddPlayerView />;
    case "log-match":
      return <LogMatchView />;
  }
}

function AppContent() {
  const [activeView, setActiveView] = useState<ViewId>("home");
  const { session } = useAuth();

  // Logging out while on a captain-only view: that view is no longer
  // reachable, so fall back to Home rather than showing a dead page.
  useEffect(() => {
    if (session) return;
    const currentItem = NAV_ITEMS.find((item) => item.id === activeView);
    if (currentItem?.requiresAuth) setActiveView("home");
  }, [session, activeView]);

  return (
    <AppShell activeView={activeView} onSelectView={setActiveView}>
      {renderView(activeView)}
    </AppShell>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}
