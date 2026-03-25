import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { Button } from "./button";

type ConfirmTone = "default" | "destructive";

interface ConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmTone;
}

interface ConfirmDialogRequest extends ConfirmDialogOptions {
  id: number;
}

interface ConfirmDialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmDialogRequest | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const closeDialog = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setRequest(null);
  }, []);

  const confirm = useCallback((options: ConfirmDialogOptions) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setRequest({
        id: Date.now(),
        confirmLabel: "Confirm",
        cancelLabel: "Cancel",
        tone: "default",
        ...options,
      });
    });
  }, []);

  useEffect(() => {
    if (!request) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDialog(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeDialog, request]);

  useEffect(() => {
    return () => {
      resolverRef.current?.(false);
    };
  }, []);

  const contextValue = useMemo<ConfirmDialogContextValue>(
    () => ({
      confirm,
    }),
    [confirm],
  );

  return (
    <ConfirmDialogContext.Provider value={contextValue}>
      {children}
      {request ? (
        <ConfirmDialogModal
          key={request.id}
          request={request}
          onCancel={() => closeDialog(false)}
          onConfirm={() => closeDialog(true)}
        />
      ) : null}
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog(): ConfirmDialogContextValue["confirm"] {
  const context = useContext(ConfirmDialogContext);

  if (!context) {
    throw new Error("useConfirmDialog must be used within ConfirmDialogProvider.");
  }

  return context.confirm;
}

function ConfirmDialogModal({
  request,
  onCancel,
  onConfirm,
}: {
  request: ConfirmDialogRequest;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(15,16,32,0.68)] backdrop-blur-sm"
        aria-label="Close confirmation dialog"
        onClick={onCancel}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        className={cn(
          "relative z-[101] w-full max-w-[520px] rounded-2xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-xl",
          "dark:bg-[rgba(23,24,44,0.96)]",
        )}
      >
        <div className="space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white/60 text-foreground dark:bg-white/10">
            {request.tone === "destructive" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            )}
          </div>
          <div className="space-y-2">
            <h2 id="confirm-dialog-title" className="m-0 text-xl font-semibold text-foreground">
              {request.title}
            </h2>
            <p id="confirm-dialog-description" className="m-0 text-sm leading-6 text-muted-foreground">
              {request.description}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={onCancel}>
              {request.cancelLabel}
            </Button>
            <Button type="button" variant={request.tone === "destructive" ? "destructive" : "default"} onClick={onConfirm}>
              {request.confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
