import { useIsMutating } from "@tanstack/react-query";
import { useEffect } from "react";
import { setBusyCount } from "@/lib/busy";

/** Mirrors in-flight react-query mutations into the global busy flag. */
export function BusyTracker() {
  const mutating = useIsMutating();
  useEffect(() => {
    setBusyCount(mutating);
  }, [mutating]);
  return null;
}
