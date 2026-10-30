import { useCallback, useEffect, useState } from "react";
import api from "../../api/api";

// DVOC · Maintenance client. Everything goes to /api/maintenance (its own collections).

/** One key per form submission: the server returns the same record if the request is retried. */
export const newRequestKey = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
export const errMsg = (e, fallback = "Something went wrong") => e?.response?.data?.message || fallback;
export const fieldErrors = (e) => e?.response?.data?.fields || {};

const data = (p) => p.then((r) => r.data);

export const maintenanceApi = {
  overview: () => data(api.get("/maintenance/overview")),
  teams: {
    list: (params) => data(api.get("/maintenance/teams", { params })),
    get: (id) => data(api.get(`/maintenance/teams/${id}`)),
    create: (body) => data(api.post("/maintenance/teams", body)),
    update: (id, body) => data(api.put(`/maintenance/teams/${id}`, body)),
    remove: (id) => data(api.delete(`/maintenance/teams/${id}`)),
  },
  samples: {
    list: (params) => data(api.get("/maintenance/samples", { params })),
    create: (body) => data(api.post("/maintenance/samples", body)),
    update: (id, body) => data(api.put(`/maintenance/samples/${id}`, body)),
    remove: (id) => data(api.delete(`/maintenance/samples/${id}`)),
  },
  tasks: {
    list: (params) => data(api.get("/maintenance/tasks", { params })),
    get: (id) => data(api.get(`/maintenance/tasks/${id}`)),
    create: (body) => data(api.post("/maintenance/tasks", body)),
    update: (id, body) => data(api.put(`/maintenance/tasks/${id}`, body)),
    remove: (id) => data(api.delete(`/maintenance/tasks/${id}`)),
    queue: (params) => data(api.get("/maintenance/processing", { params })),
    bulkUpload: (body) => data(api.post("/maintenance/tasks/bulk-upload", body)),
  },
  tickets: {
    list: (taskId) => data(api.get(`/maintenance/tasks/${taskId}/tickets`)),
    record: (taskId, body) => data(api.post(`/maintenance/tasks/${taskId}/tickets`, body)),
    update: (id, body) => data(api.put(`/maintenance/tickets/${id}`, body)),
    remove: (id) => data(api.delete(`/maintenance/tickets/${id}`)),
  },
};

export const STATUS_TONE = { Todo: "neutral", "In Progress": "accent", Closed: "success" };
export const PRIORITY_TONE = { High: "danger", Medium: "warning", Low: "neutral" };
export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const monthLabel = (y, m) => `${MONTHS[m - 1]} ${y}`;

/** Maintenance teams for pickers; `reload` after creating one elsewhere. */
export const useMaintenanceTeams = (params = {}) => {
  const key = JSON.stringify(params);
  const [state, setState] = useState({ teams: [], loading: true, error: null });
  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    maintenanceApi.teams
      .list(JSON.parse(key))
      .then((teams) => setState({ teams, loading: false, error: null }))
      .catch((e) => setState({ teams: [], loading: false, error: errMsg(e, "Couldn't load maintenance teams") }));
  }, [key]);
  useEffect(load, [load]);
  return { ...state, reload: load };
};

/** Shared dropdown lists (governorates, RCA, GAIA transaction codes) from Dropdown Management. */
export const useDropdowns = () => {
  const [lists, setLists] = useState({});
  useEffect(() => {
    let alive = true;
    api
      .get("/dropdown-options/all")
      .then(({ data: d }) => alive && setLists(d || {}))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return useCallback((k) => (lists[k] || []).map((o) => ({ value: o.value, label: o.label || o.value })), [lists]);
};
