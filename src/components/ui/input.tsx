import { InputHTMLAttributes, forwardRef, ReactNode } from "react";

export const inputClass =
  "h-8 w-full rounded-[3px] border border-border bg-white px-2.5 text-[13px] text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-background disabled:text-text-muted";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`${inputClass} ${className}`} {...props} />;
  },
);

export function IconInput({
  icon,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-muted">
        {icon}
      </span>
      <input className={`${inputClass} pl-7 ${className}`} {...props} />
    </div>
  );
}
