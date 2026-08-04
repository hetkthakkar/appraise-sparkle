import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isBusy } from "@/lib/busy";

/**
 * Refetches every active query as soon as the tab regains focus or becomes
 * visible again, so switching back to the app always shows the latest data.
 */
export function LiveRefresh() {
  const qc = useQueryClient();

  useEffect(() => {
    const refetchAll = () => {
      if (isBusy()) return;
      qc.refetchQueries({ type: "active" });
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") refetchAll();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refetchAll);
    window.addEventListener("online", refetchAll);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refetchAll);
      window.removeEventListener("online", refetchAll);
    };
  }, [qc]);

  return null;
}
