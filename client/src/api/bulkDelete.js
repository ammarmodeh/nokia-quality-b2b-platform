import api from "./api";
import { DELETE_PHRASE } from "../components/ui/SafeDeleteDialog";

/**
 * Permanent delete through POST <path> { ids, confirm }. Resolves with the server's
 * { deleted, failed } — also when the server refused every record (404 / 409),
 * so the dialog can say why. Network, auth and validation errors throw.
 * path: "/tasks/bulk-delete", "/custom-tables/<id>/rows/purge", …
 */
export const bulkDelete = async (path, ids) => {
  try {
    const { data } = await api.post(path, { ids, confirm: DELETE_PHRASE });
    return { deleted: data.deleted || [], failed: data.failed || [], warning: data.warning };
  } catch (e) {
    const d = e?.response?.data;
    if ([404, 409].includes(e?.response?.status) && Array.isArray(d?.failed)) return { deleted: d.deleted || [], failed: d.failed };
    if (e?.response?.status === 403) throw new Error("Only admins can permanently delete these records");
    throw e;
  }
};

/** Resource paths for the admin bulk-delete endpoints. */
export const DELETE_PATHS = {
  tasks: "/tasks/bulk-delete",
  snags: "/customer-issues/bulk-delete",
  lab: "/lab-assessments/bulk-delete",
  ojt: "/on-the-job-assessments/bulk-delete",
  quiz: "/quiz/bulk-delete",
  quizResults: "/quiz-results/bulk-delete",
  dropdowns: "/dropdown-options/bulk-delete",
  fieldTeams: "/field-teams/bulk-delete",
  tableRows: (tableId) => `/custom-tables/${tableId}/rows/purge`,
};
