import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/utils";
import { Button } from "./button";
import { Input } from "./input";

interface TextPromptDialogProps {
  open: boolean;
  title: string;
  description: string;
  label: string;
  initialValue: string;
  submitLabel?: string;
  cancelLabel?: string;
  placeholder?: string;
  onClose: () => void;
  onSubmit: (value: string) => void;
}

export function TextPromptDialog({
  open,
  title,
  description,
  label,
  initialValue,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  placeholder,
  onClose,
  onSubmit,
}: TextPromptDialogProps) {
  const [value, setValue] = useState(initialValue);
  const titleId = useId();
  const descriptionId = useId();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValue(initialValue);
  }, [initialValue, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  const trimmedValue = value.trim();

  const handleSubmit = () => {
    if (trimmedValue.length === 0) {
      return;
    }

    onSubmit(trimmedValue);
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8">
      <button
        type="button"
        className="absolute inset-0 bg-[rgba(15,16,32,0.68)] backdrop-blur-sm"
        aria-label="Close naming dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          "relative z-[101] w-full max-w-[560px] overflow-hidden rounded-[28px] border border-border bg-card/95 shadow-2xl backdrop-blur-xl",
          "dark:bg-[rgba(23,24,44,0.96)]",
        )}
      >
        <div className="border-b border-border/70 bg-gradient-to-br from-white/70 via-white/35 to-transparent p-6 dark:from-white/10 dark:via-white/5 dark:to-transparent">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white/65 text-foreground shadow-sm dark:bg-white/10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6" aria-hidden="true">
              <path d="M12 20h9" />
              <path d="m16.5 3.5 4 4L7 21H3v-4L16.5 3.5Z" />
            </svg>
          </div>
          <div className="mt-4 space-y-2">
            <h2 id={titleId} className="m-0 text-xl font-semibold text-foreground">
              {title}
            </h2>
            <p id={descriptionId} className="m-0 max-w-[42ch] text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <form
          className="space-y-5 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit();
          }}
        >
          <div className="rounded-2xl border border-border bg-white/45 p-4 dark:bg-white/5">
            <label className="block text-sm font-semibold text-foreground" htmlFor={inputId}>
              {label}
            </label>
            <div className="mt-3">
              <Input
                id={inputId}
                ref={inputRef}
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder={placeholder}
                maxLength={80}
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Button type="button" variant="secondary" onClick={onClose}>
              {cancelLabel}
            </Button>
            <Button type="submit" disabled={trimmedValue.length === 0}>
              {submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
