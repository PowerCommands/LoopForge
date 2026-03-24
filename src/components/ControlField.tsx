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
    <label className="control-field" htmlFor={htmlFor}>
      <span className="control-field__label">{label}</span>
      {children}
      {hint ? <span className="control-field__hint">{hint}</span> : null}
    </label>
  );
}
