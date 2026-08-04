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
    try {
      await qc.refetchQueries({ type: "active" });
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
    >
      <RefreshCw className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`} />
    </Button>
  );
}
