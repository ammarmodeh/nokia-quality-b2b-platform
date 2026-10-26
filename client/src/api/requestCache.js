import api from "./api";

// Short-lived GET cache that also merges concurrent identical requests,
// for small reference data several components ask for at once (e.g. samples-token per year).
const entries = new Map(); // url -> { at, promise }

export const cachedGet = (url, { ttl = 30000, force = false } = {}) => {
  const hit = entries.get(url);
  if (hit && !force && Date.now() - hit.at < ttl) return hit.promise;
  const promise = api.get(url).catch((err) => {
    entries.delete(url);
    throw err;
  });
  entries.set(url, { at: Date.now(), promise });
  return promise;
};

export const clearCachedGet = (prefix = "") => {
  for (const url of entries.keys()) if (url.startsWith(prefix)) entries.delete(url);
};
