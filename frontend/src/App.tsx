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

function isViewId(value: string): value is ViewId {
  return NAV_ITEMS.some((item) => item.id === value);
}

function getViewFromHash(): ViewId {
  const hash = window.location.hash.slice(1);
  return isViewId(hash) ? hash : "home";
}

function AppContent() {
  const [activeView, setActiveView] = useState<ViewId>(getViewFromHash);
  const { session } = useAuth();

  // Mirror the active tab in the URL hash so refresh, back/forward, and
  // sharing a link all land on the same tab instead of always resetting
  // to Home. A hash (not a path) is deliberate - it never leaves the
  // browser, so it needs no CloudFront SPA-fallback config (see plan §5).
  useEffect(() => {
    if (window.location.hash.slice(1) !== activeView) {
      window.location.hash = activeView;
    }
  }, [activeView]);

  useEffect(() => {
    function handleHashChange() {
      setActiveView(getViewFromHash());
    }
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

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
