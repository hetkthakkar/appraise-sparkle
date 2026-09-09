import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  hint?: string;
  className?: string;
  valueClassName?: string;
}

export function StatCard({ label, value, icon: Icon, hint, className, valueClassName }: Props) {
  return (
    <Card className={`transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-md hover:border-primary/20 ${className ?? ""}`}>
      <CardContent className="flex items-center justify-between gap-4 p-6">
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <span className="text-sm text-muted-foreground truncate">{label}</span>
          <div className={valueClassName || "text-3xl font-semibold tracking-tight"}>{value}</div>
          {hint && <span className="text-xs text-muted-foreground truncate">{hint}</span>}
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
      </CardContent>
    </Card>
  );
}
