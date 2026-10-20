import api from "../../api/api";

const d = (p) => p.then((r) => r.data);
const base = (id) => `/custom-tables/${id}`;
// The sidebar and tracker pages listen for this to refresh their table lists.
const changed = (p) => p.then((x) => { window.dispatchEvent(new CustomEvent("custom-tables-changed")); return x; });

export const tablesApi = {
  list: (params) => d(api.get("/custom-tables", { params })),
  get: (id) => d(api.get(base(id))),
  create: (body) => changed(d(api.post("/custom-tables", body))),
  update: (id, body) => changed(d(api.patch(base(id), body))),
  remove: (id, confirm) => changed(d(api.delete(base(id), { data: { confirm } }))),
  saveAsTemplate: (id, body) => d(api.post(`${base(id)}/save-as-template`, body)),

  addField: (id, body) => d(api.post(`${base(id)}/fields`, body)),
  updateField: (id, key, body) => d(api.patch(`${base(id)}/fields/${key}`, body)),
  previewConvert: (id, key, body) => d(api.post(`${base(id)}/fields/${key}/convert-preview`, body)),
  reorderFields: (id, keys) => d(api.put(`${base(id)}/fields/order`, { keys })),
  archiveField: (id, key, hard = false) => d(api.delete(`${base(id)}/fields/${key}`, { params: hard ? { hard: true } : {} })),
  restoreField: (id, key) => d(api.post(`${base(id)}/fields/${key}/restore`)),

  rows: (id, params) => d(api.get(`${base(id)}/rows`, { params })),
  createRow: (id, data) => d(api.post(`${base(id)}/rows`, { data })),
  updateRow: (id, rowId, body) => d(api.patch(`${base(id)}/rows/${rowId}`, body)),
  bulk: (id, items) => d(api.post(`${base(id)}/rows/bulk`, { items })),
  deleteRows: (id, ids) => d(api.post(`${base(id)}/rows/delete`, { ids })),
  restoreRows: (id, ids) => d(api.post(`${base(id)}/rows/restore`, { ids })),
  activity: (id, rowId) => d(api.get(`${base(id)}/rows/${rowId}/activity`)),

  views: (id) => d(api.get(`${base(id)}/views`)),
  createView: (id, body) => d(api.post(`${base(id)}/views`, body)),
  updateView: (id, viewId, body) => d(api.patch(`${base(id)}/views/${viewId}`, body)),
  deleteView: (id, viewId) => d(api.delete(`${base(id)}/views/${viewId}`)),

  importRows: (id, body) => d(api.post(`${base(id)}/import`, body)),
  batches: (id) => d(api.get(`${base(id)}/batches`)),
  finishBatch: (id, batchId) => d(api.post(`${base(id)}/batches/${batchId}/finish`)),
  rollbackBatch: (id, batchId) => d(api.post(`${base(id)}/batches/${batchId}/rollback`)),

  calendar: (params) => d(api.get("/custom-tables/calendar", { params })),
};

export const templatesApi = {
  list: (params) => d(api.get("/table-templates", { params })),
  get: (id) => d(api.get(`/table-templates/${encodeURIComponent(id)}`)),
  create: (body) => d(api.post("/table-templates", body)),
  update: (id, body) => d(api.patch(`/table-templates/${encodeURIComponent(id)}`, body)),
  duplicate: (id) => d(api.post(`/table-templates/${encodeURIComponent(id)}/duplicate`)),
};

export const filesApi = {
  upload: (file, extra = {}) => {
    const fd = new FormData();
    Object.entries(extra).forEach(([k, v]) => v !== undefined && v !== null && fd.append(k, v));
    fd.append("file", file);
    return d(api.post("/stored-files", fd, { headers: { "Content-Type": "multipart/form-data" } }));
  },
  list: (params) => d(api.get("/stored-files", { params })),
  /** Fetch through the authenticated client, then save or open it. */
  download: async (file, { inline = false } = {}) => {
    const res = await api.get(`/stored-files/${file._id}/download`, { params: inline ? { inline: true } : {}, responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    if (inline) return url;
    const a = document.createElement("a");
    a.href = url;
    a.download = file.originalName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return null;
  },
};
