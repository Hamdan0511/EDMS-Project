import { SelectHTMLAttributes, forwardRef } from "react";
import { ChevronDown } from "@/components/ui/icons";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={`h-8 w-full appearance-none rounded-[3px] border border-border bg-white pl-2.5 pr-7 text-[13px] text-text-primary outline-none focus:border-accent focus:ring-1 focus:ring-accent disabled:bg-background disabled:text-text-muted ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={14}
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted"
        />
      </div>
    );
  },
);
