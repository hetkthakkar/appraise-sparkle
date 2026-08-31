import { ArrowUpRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AcentricBadgeProps {
  className?: string;
  variant?: "floating" | "inline";
}

export function AcentricBadge({
  className,
  variant = "floating",
}: AcentricBadgeProps) {
  return (
    <a
      href="https://acentric.in/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Built by Acentric"
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-background/85 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-md transition-all duration-200 hover:border-primary/40 hover:bg-background/95 hover:text-foreground hover:shadow-sm active:scale-95 dark:border-border/40 dark:bg-zinc-900/80 dark:hover:bg-zinc-900/95",
        variant === "floating" && "fixed bottom-3.5 right-3.5 z-40 shadow-xs",
        className
      )}
    >
      <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 transition-all duration-300 group-hover:bg-emerald-400 group-hover:ring-emerald-500/40" />
      <span className="tracking-tight text-muted-foreground/80">Built by</span>
      <span className="font-semibold text-foreground transition-colors group-hover:text-primary">
        Acentric
      </span>
      <ArrowUpRight className="h-3 w-3 text-muted-foreground/60 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground" />
    </a>
  );
}
