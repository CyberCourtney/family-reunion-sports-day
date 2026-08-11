// Single source of truth for tournament identity/dates. Nothing
// tournament-specific should be hard-coded outside this module - update
// the env vars once a year and every screen that reads TOURNAMENT_CONFIG
// picks it up automatically.

export const TOURNAMENT_CONFIG = {
  name: import.meta.env.VITE_TOURNAMENT_NAME,
  tagline: import.meta.env.VITE_TOURNAMENT_TAGLINE,
  start: new Date(import.meta.env.VITE_TOURNAMENT_START),
  end: new Date(import.meta.env.VITE_TOURNAMENT_END),
  get year() {
    return this.start.getFullYear();
  },
};
