import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { LoginForm } from "../auth/LoginForm";

interface LoginSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

// Bottom sheet on mobile (slides up, feels native, keeps context),
// centered modal at >=768px - one component, responsive presentation.
export function LoginSheet({ isOpen, onClose }: LoginSheetProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 animate-[fade-in_0.15s_ease-out]"
      />

      <div className="relative w-full md:max-w-sm bg-white rounded-t-3xl md:rounded-3xl p-6 pb-8 md:pb-6 shadow-xl animate-[sheet-up_0.2s_ease-out] md:animate-[fade-in_0.15s_ease-out]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-lg">Captain Login</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink-muted hover:bg-surface transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <LoginForm onSuccess={onClose} />
      </div>
    </div>,
    document.body,
  );
}
