// Tracks in-flight work (API requests, lazy route loads) for the top loading bar.
// Requests can opt out with `api.get(url, { silentProgress: true })` (e.g. background polling).
let inFlight = 0;
const listeners = new Set();
const emit = () => listeners.forEach((fn) => fn(inFlight));

export const activity = {
  start() {
    inFlight += 1;
    emit();
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      inFlight = Math.max(0, inFlight - 1);
      emit();
    };
  },
  subscribe(fn) {
    listeners.add(fn);
    fn(inFlight);
    return () => listeners.delete(fn);
  },
};
