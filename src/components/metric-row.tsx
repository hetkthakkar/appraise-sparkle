import { Progress } from "@/components/ui/progress";

interface Props {
  label: string;
  target: number;
  actual: number;
  /** When true, lower actual is better (e.g. errors). */
  invert?: boolean;
}

export function MetricRow({ label, target, actual, invert }: Props) {
  const pct = target === 0 ? 0 : Math.min(150, Math.round((actual / target) * 100));
  const good = invert ? actual <= target : actual >= target;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          <span className={good ? "text-emerald-600 font-semibold" : "text-amber-600 font-semibold"}>
            {actual}
          </span>{" "}
          / {target}
        </span>
      </div>
      <Progress value={Math.min(100, pct)} />
    </div>
  );
}
