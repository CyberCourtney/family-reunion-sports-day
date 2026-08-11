import { useContext } from "react";
import { ToastContext } from "../context/toastContextObject";

export function useToast() {
  const showToast = useContext(ToastContext);
  if (!showToast) throw new Error("useToast must be used within ToastProvider");
  return showToast;
}
