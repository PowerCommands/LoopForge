import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";
import { Select } from "./select";
import { cn } from "../../lib/utils";

export type ExportFormat = "wav" | "midi";

interface ExportDialogProps {
  open: boolean;
  title: string;
  description: string;
  isSubmitting?: boolean;
  onClose: () => void;
  onDownload: (format: ExportFormat) => Promise<void> | void;
}

export function ExportDialog({
  open,
  title,
  description,
  isSubmitting = false,
  onClose,
  onDownload,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>("wav");

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormat("wav");
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmitting, onClose, open]);

  if (!open) {
    return null;
  }

  const handleDownload = async () => {
    await onDownload(format);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(15,16,32,0.68)] backdrop-blur-sm"
        aria-label="Close export dialog"
        onClick={() => {
          if (!isSubmitting) {
            onClose();
          }
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        aria-describedby="export-dialog-description"
        className={cn(
          "relative z-[101] w-full max-w-[560px] rounded-2xl border border-border bg-card/95 p-6 shadow-2xl backdrop-blur-xl",
          "dark:bg-[rgba(23,24,44,0.96)]",
        )}
      >
        <div className="space-y-5">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white/60 text-foreground dark:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
              <path d="M12 4v12" />
              <path d="m17 11-5 5-5-5" />
              <path d="M4 20h16" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 id="export-dialog-title" className="m-0 text-xl font-semibold text-foreground">
              {title}
            </h2>
            <p id="export-dialog-description" className="m-0 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white/45 p-4 dark:bg-white/5">
            <label className="block text-sm font-semibold text-foreground" htmlFor="export-format">
              Export format
            </label>
            <div className="mt-3 max-w-[220px]">
              <Select id="export-format" value={format} onChange={(event) => setFormat(event.target.value as ExportFormat)} disabled={isSubmitting}>
                <option value="wav">WAV</option>
                <option value="midi">MIDI</option>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleDownload} disabled={isSubmitting}>
              {isSubmitting ? "Exporting..." : "Download"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
