import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
}

export function StatCard({ label, value, icon: Icon, hint }: Props) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-3.5 sm:p-5 md:p-6">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          <span className="text-xs sm:text-sm text-muted-foreground">{label}</span>
          <span className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight">{value}</span>
          {hint && <span className="text-[11px] sm:text-xs text-muted-foreground">{hint}</span>}
        </div>
        <div className="flex h-9 w-9 min-w-9 sm:h-11 sm:w-11 sm:min-w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5 sm:h-5.5 sm:w-5.5" />
        </div>
      </CardContent>
    </Card>
  );
}
