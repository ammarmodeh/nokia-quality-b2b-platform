// Keeps the in-memory taxonomy in step with the Tracker collection. Each server instance
// reloads at most every 30 s (and right after a tracker changes on that instance).
import { Tracker } from "../models/qopsModels.js";
import { setCustomTrackers } from "./taxonomy.js";

const TTL = 30 * 1000;
let loadedAt = 0;
let pending = null;

export const reloadTrackers = async () => {
  const list = await Tracker.find({ archived: false }).sort({ order: 1, name: 1 }).lean();
  setCustomTrackers(list);
  loadedAt = Date.now();
  return list;
};

/** Express middleware: refresh the taxonomy when it is stale; never blocks a request on failure. */
export const ensureTrackers = async (_req, _res, next) => {
  if (Date.now() - loadedAt < TTL) return next();
  try {
    pending = pending || reloadTrackers().finally(() => { pending = null; });
    await pending;
  } catch {
    loadedAt = Date.now() - TTL + 5000; // try again in a few seconds
  }
  next();
};
