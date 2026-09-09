import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

/**
 * Manual refresh: immediately refetches the queries feeding the current page
 * and spins while doing so.
 */
export function RefreshButton() {
  const qc = useQueryClient();
  const [spinning, setSpinning] = useState(false);

  const refresh = async () => {
    if (spinning) return;
    setSpinning(true);
    const start = Date.now();
    try {
      await qc.invalidateQueries();
      await qc.refetchQueries({ type: "active" });
      const elapsed = Date.now() - start;
      if (elapsed < 500) {
        await new Promise((r) => setTimeout(r, 500 - elapsed));
      }
      toast.success("Data refreshed", { duration: 1800 });
    } catch (e) {
      toast.error("Refresh failed", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSpinning(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Refresh data"
      title="Refresh data"
      onClick={refresh}
      disabled={spinning}
      className="relative"
    >
      <RefreshCw
        className={`h-4 w-4 transition-transform ${spinning ? "animate-spin text-primary" : "text-muted-foreground hover:text-foreground"}`}
      />
    </Button>
  );
}
