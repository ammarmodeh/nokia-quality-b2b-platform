import { useEffect, useState } from "react";
import { trackersApi } from "../api/qops";
import { customTrackers, onTrackersChange, registerTrackers, TAXONOMY } from "../constants/taxonomy";

let loading = null;
/** Load the trackers added online once per session (again after `reloadTrackers`). */
export const reloadTrackers = () => {
  loading = trackersApi.list().then((list) => { registerTrackers(list); return list; }).catch(() => []);
  return loading;
};

/**
 * Re-renders when trackers are added, renamed or archived.
 * Returns { all: TAXONOMY entries (built-in + custom), custom }.
 */
export const useTrackers = () => {
  const [, setV] = useState(0);
  useEffect(() => {
    const off = onTrackersChange(setV);
    if (!loading) reloadTrackers();
    return off;
  }, []);
  return { all: [...TAXONOMY], custom: customTrackers() };
};
