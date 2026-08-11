import { useCallback } from "react";
import { useAuth } from "./useAuth";
import { useToast } from "./useToast";
import { ApiError } from "../lib/api";

// Shared 401/403 handling for mutations: auto-logout + a clear message +
// reopen the login sheet, rather than each form reimplementing this.
export function useSessionExpiry() {
  const { logout, openLoginSheet } = useAuth();
  const toast = useToast();

  return useCallback(
    (error: unknown): boolean => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        logout();
        toast("Your session expired — please log in again.", "error");
        openLoginSheet();
        return true;
      }
      return false;
    },
    [logout, openLoginSheet, toast],
  );
}
