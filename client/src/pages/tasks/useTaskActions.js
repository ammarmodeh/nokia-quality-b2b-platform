import { useCallback } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import api from "../../api/api";

const idOf = (u) => (u && typeof u === "object" ? u._id : u);

/**
 * Task mutations shared by Board, Table, Calendar and the side sheet.
 * All writes are optimistic and roll back on failure.
 * `setTasks` is the page's state setter; `users` resolves ids → user objects.
 */
export default function useTaskActions(setTasks, users = []) {
  const me = useSelector((s) => s?.auth?.user);

  const hydrate = useCallback(
    (patch) => {
      if (!Array.isArray(patch.assignedTo)) return patch;
      return { ...patch, assignedTo: patch.assignedTo.map((u) => users.find((x) => x._id === idOf(u)) || u) };
    },
    [users]
  );

  /** Patch one or many tasks. `patches` = { [id]: partialFields } */
  const patchMany = useCallback(
    async (patches, { success } = {}) => {
      const ids = Object.keys(patches);
      let snapshot = [];
      setTasks((prev) => {
        snapshot = prev;
        return prev.map((t) => (patches[t._id] ? { ...t, ...hydrate(patches[t._id]) } : t));
      });
      const results = await Promise.allSettled(
        ids.map((id) => {
          const body = { ...patches[id] };
          if (Array.isArray(body.assignedTo)) body.assignedTo = body.assignedTo.map(idOf);
          return api.put(`/tasks/update-task/${id}`, body);
        })
      );
      const failed = ids.filter((_, i) => results[i].status === "rejected");
      if (failed.length) {
        setTasks((prev) => prev.map((t) => (failed.includes(t._id) ? snapshot.find((s) => s._id === t._id) || t : t)));
        toast.error(failed.length === ids.length ? "Couldn't save changes" : `${failed.length} of ${ids.length} updates failed and were reverted`);
        return false;
      }
      if (success) toast.success(success);
      return true;
    },
    [setTasks, hydrate]
  );

  const patchOne = useCallback((id, patch, opts) => patchMany({ [id]: patch }, opts), [patchMany]);

  /** Move to Trash (same flow as before), with an Undo toast that restores it. */
  const removeMany = useCallback(
    async (tasks) => {
      const ids = tasks.map((t) => t._id);
      let snapshot = [];
      setTasks((prev) => {
        snapshot = prev;
        return prev.filter((t) => !ids.includes(t._id));
      });
      const trashed = [];
      const failed = [];
      for (const t of tasks) {
        try {
          const { data: full } = await api.get(`/tasks/get-task/${t._id}`);
          const res = await api.post("/trash/add-trash", { ...full, deletedBy: me?._id, deletedAt: new Date() });
          if (res.status !== 201) throw new Error("trash failed");
          await api.delete(`/tasks/delete-task/${t._id}`);
          trashed.push(res.data?.data?._id);
        } catch {
          failed.push(t._id);
        }
      }
      if (failed.length) {
        setTasks((prev) => [...prev, ...snapshot.filter((s) => failed.includes(s._id))]);
        toast.error(`${failed.length} task(s) couldn't be deleted`);
      }
      const ok = tasks.length - failed.length;
      if (ok > 0) {
        const restorable = trashed.filter(Boolean);
        toast.success(ok === 1 ? "Task moved to trash" : `${ok} tasks moved to trash`, {
          action: restorable.length
            ? {
                label: "Undo",
                onClick: async () => {
                  const res = await Promise.allSettled(restorable.map((id) => api.post(`/trash/${id}/restore`)));
                  const restored = res.filter((r) => r.status === "fulfilled").map((r) => r.value.data?.data).filter(Boolean);
                  setTasks((prev) => {
                    const keep = new Map(snapshot.map((s) => [s._id, s]));
                    return [...prev, ...restored.map((r) => keep.get(r._id) || r)];
                  });
                  toast.success(restored.length === restorable.length ? "Restored" : "Some tasks couldn't be restored");
                },
              }
            : undefined,
        });
      }
    },
    [setTasks, me]
  );

  return { patchOne, patchMany, removeMany };
}
