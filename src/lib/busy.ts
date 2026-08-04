/**
 * Tracks whether a save / edit / upload is currently in flight so background
 * polling can be paused while the user is writing data.
 */
let count = 0;
const listeners = new Set<() => void>();

export function isBusy() {
  return count > 0;
}

export function setBusyCount(next: number) {
  if (next === count) return;
  count = next;
  listeners.forEach((l) => l());
}

export function beginBusy() {
  setBusyCount(count + 1);
  let done = false;
  return () => {
    if (done) return;
    done = true;
    setBusyCount(Math.max(0, count - 1));
  };
}

export function subscribeBusy(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
