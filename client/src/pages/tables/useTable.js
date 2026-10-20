import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/api";
import { tablesApi } from "./tablesApi";

const errText = (e) => e?.response?.data?.message || e?.message || "Something went wrong";

let lookupCache = null;
/** Users and field teams by id, shared by every table page. */
export const useLookups = () => {
  const [lookups, setLookups] = useState(lookupCache || { users: {}, teams: {}, userList: [], teamList: [] });
  useEffect(() => {
    if (lookupCache) return;
    let off = false;
    Promise.allSettled([api.get("/users/get-all-users"), api.get("/field-teams/get-field-teams")]).then(([u, t]) => {
      const userList = u.status === "fulfilled" ? (u.value.data || []).filter((x) => x.isActive !== false).map(({ _id, name, email, color }) => ({ _id, name, email, color })) : [];
      const teamList = t.status === "fulfilled" ? (t.value.data || []).map(({ _id, teamName, teamCompany, isTerminated }) => ({ _id, teamName, teamCompany, isTerminated })) : [];
      lookupCache = { userList, teamList, users: Object.fromEntries(userList.map((x) => [x._id, x])), teams: Object.fromEntries(teamList.map((x) => [x._id, x])) };
      if (!off) setLookups(lookupCache);
    });
    return () => { off = true; };
  }, []);
  return lookups;
};

/**
 * Loads one custom table with its views and rows and exposes optimistic edits.
 * Row edits update local state immediately and roll back if the server refuses.
 */
export const useTable = (id) => {
  const [table, setTable] = useState(null);
  const [views, setViews] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;

  const loadRows = useCallback(async () => {
    const out = await tablesApi.rows(id, { limit: 5000 });
    setRows(out.rows);
    setTotal(out.total);
  }, [id]);

  const reload = useCallback(async () => {
    setError(null);
    try {
      const [t, v] = await Promise.all([tablesApi.get(id), tablesApi.views(id)]);
      setTable(t);
      setViews(v);
      await loadRows();
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, [id, loadRows]);

  useEffect(() => {
    setLoading(true);
    reload();
  }, [reload]);

  const fields = useMemo(() => (table?.fields || []).filter((f) => !f.archived).sort((a, b) => a.order - b.order), [table]);

  const notify = (message, tone = "danger") => setToast({ message, tone, at: Date.now() });

  const updateCells = useCallback(
    async (items) => {
      // items: [{ rowId, key, value }]
      const before = rowsRef.current;
      const byRow = new Map();
      items.forEach(({ rowId, key, value }) => byRow.set(rowId, { ...(byRow.get(rowId) || {}), [key]: value }));
      setRows((list) => list.map((r) => (byRow.has(r._id) ? { ...r, data: { ...r.data, ...byRow.get(r._id) } } : r)));
      try {
        if (byRow.size === 1) {
          const [[rowId, data]] = [...byRow.entries()];
          const row = await tablesApi.updateRow(id, rowId, { data });
          setRows((list) => list.map((r) => (r._id === rowId ? row : r)));
        } else {
          const out = await tablesApi.bulk(id, [...byRow.entries()].map(([rowId, data]) => ({ rowId, data })));
          const fresh = new Map(out.results.filter((r) => r.ok).map((r) => [r.row._id, r.row]));
          setRows((list) => list.map((r) => fresh.get(r._id) || before.find((b) => b._id === r._id) || r));
          if (out.failed) notify(`${out.failed} cell update${out.failed === 1 ? "" : "s"} failed: ${out.results.find((r) => !r.ok).message}`);
        }
        return true;
      } catch (e) {
        setRows(before);
        notify(errText(e));
        return false;
      }
    },
    [id]
  );

  const addRow = useCallback(
    async (data = {}) => {
      try {
        const row = await tablesApi.createRow(id, data);
        setRows((list) => [...list, row]);
        setTotal((n) => n + 1);
        return row;
      } catch (e) {
        notify(errText(e));
        return null;
      }
    },
    [id]
  );

  /** Paste into empty space: create rows from cell data. */
  const addRows = useCallback(
    async (datas) => {
      const out = await tablesApi.bulk(id, datas.map((data) => ({ data })));
      const created = out.results.filter((r) => r.ok).map((r) => r.row);
      setRows((list) => [...list, ...created]);
      setTotal((n) => n + created.length);
      if (out.failed) notify(`${out.failed} row${out.failed === 1 ? "" : "s"} couldn't be added: ${out.results.find((r) => !r.ok).message}`);
      return created;
    },
    [id]
  );

  const deleteRows = useCallback(
    async (ids) => {
      const before = rowsRef.current;
      setRows((list) => list.filter((r) => !ids.includes(r._id)));
      try {
        await tablesApi.deleteRows(id, ids);
        setTotal((n) => n - ids.length);
        setToast({
          message: `${ids.length} row${ids.length === 1 ? "" : "s"} deleted`,
          tone: "neutral",
          at: Date.now(),
          action: {
            label: "Undo",
            run: async () => {
              await tablesApi.restoreRows(id, ids);
              await loadRows();
            },
          },
        });
      } catch (e) {
        setRows(before);
        notify(errText(e));
      }
    },
    [id, loadRows]
  );

  const replaceRow = useCallback((row) => setRows((list) => list.map((r) => (r._id === row._id ? row : r))), []);

  return { table, setTable, fields, views, setViews, rows, total, loading, error, reload, loadRows, updateCells, addRow, addRows, deleteRows, replaceRow, toast, setToast, notify };
};

export { errText };
