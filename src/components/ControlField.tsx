import type { PropsWithChildren, ReactNode } from "react";

interface ControlFieldProps {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
}

export function ControlField({
  label,
  htmlFor,
  hint,
  children,
}: PropsWithChildren<ControlFieldProps>) {
  return (
    <label className="flex flex-col gap-2" htmlFor={htmlFor}>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
