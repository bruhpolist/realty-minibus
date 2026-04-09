import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export function Button({ className, variant = "default", ...props }: ButtonProps): JSX.Element {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition",
        variant === "default" && "bg-app-accent text-white hover:opacity-90",
        variant === "outline" && "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50",
        className
      )}
      {...props}
    />
  );
}
