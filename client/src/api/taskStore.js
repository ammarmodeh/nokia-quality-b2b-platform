import { useEffect, useState } from "react";
import api from "./api";

// Shared, de-duplicated cache for slim task rows (GET /tasks/get-all-tasks?view=summary).
// Pages render the cached copy straight away and revalidate in the background; the server
// answers 304 when nothing changed, so revalidating is cheap.
const cache = new Map(); // key -> { data, at, promise }
const listeners = new Set();

const keyOf = ({ from, to } = {}) => `${from || ""}|${to || ""}`;

export const fetchTaskSummaries = (range = {}) => {
  const key = keyOf(range);
  const entry = cache.get(key) || {};
  if (entry.promise) return entry.promise; // one request per range at a time
  const params = { view: "summary" };
  if (range.from) params.from = range.from;
  if (range.to) params.to = range.to;
  // Send our own validator: the browser's HTTP cache can't be relied on for a payload this size.
  const headers = entry.etag && entry.data ? { "If-None-Match": entry.etag } : {};
  const promise = api
    .get("/tasks/get-all-tasks", { params, headers, validateStatus: (s) => (s >= 200 && s < 300) || s === 304 })
    .then(({ status, data, headers: res }) => {
      if (status === 304) {
        cache.set(key, { ...entry, at: Date.now(), promise: undefined });
        return entry.data; // unchanged: same array, so nothing re-renders
      }
      const rows = Array.isArray(data) ? data : data?.tasks || [];
      cache.set(key, { data: rows, etag: res?.etag, at: Date.now() });
      listeners.forEach((fn) => fn(key));
      return rows;
    })
    .catch((err) => {
      cache.set(key, { ...entry, promise: undefined });
      throw err;
    });
  cache.set(key, { ...entry, promise });
  return promise;
};

/** Marks every cached range stale; mounted hooks refetch. Call after task/ticket writes made outside a page's own state. */
export const invalidateTasks = () => {
  for (const [key, entry] of cache) cache.set(key, { ...entry, at: 0 });
  listeners.forEach((fn) => fn(null));
};

/**
 * Task summaries for a date window (ISO strings; omit both for all time).
 * Returns cached rows immediately when available. `reloadKey` forces a revalidation.
 */
export const useTaskSummaries = ({ from, to } = {}, reloadKey = 0) => {
  const key = keyOf({ from, to });
  const [state, setState] = useState(() => ({ data: cache.get(key)?.data || null, error: null, pending: true }));

  useEffect(() => {
    let alive = true;
    const cached = cache.get(key)?.data;
    // Switching ranges keeps the previous rows on screen until the new ones arrive.
    setState((s) => ({ data: cached || s.data, error: null, pending: true }));
    fetchTaskSummaries({ from, to })
      .then((data) => alive && setState({ data, error: null, pending: false }))
      .catch((error) => alive && setState((s) => ({ data: s.data, error, pending: false })));
    const onChange = (changed) => {
      if (!alive) return;
      if (changed === key) setState({ data: cache.get(key).data, error: null, pending: false });
      else if (changed === null) fetchTaskSummaries({ from, to }).catch(() => {});
    };
    listeners.add(onChange);
    return () => {
      alive = false;
      listeners.delete(onChange);
    };
  }, [key, from, to, reloadKey]);

  return { data: state.data, loading: !state.data && !state.error, refreshing: state.pending && Boolean(state.data), error: state.error };
};
