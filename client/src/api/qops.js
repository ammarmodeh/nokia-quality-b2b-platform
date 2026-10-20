import api from "./api";

const data = (p) => p.then((r) => r.data);

export const trackersApi = {
  list: (params) => data(api.get("/trackers", { params })),
  create: (body) => data(api.post("/trackers", body)),
  update: (id, body) => data(api.patch(`/trackers/${id}`, body)),
  remove: (id) => data(api.post(`/trackers/${id}/delete`, { confirm: "permanent delete" })),
};

export const teamCodesApi = {
  list: (params) => data(api.get("/team-codes", { params })),
  resolve: (code, date) => data(api.get("/team-codes/resolve", { params: { code, date } })),
  create: (body) => data(api.post("/team-codes", body)),
  update: (id, body) => data(api.patch(`/team-codes/${id}`, body)),
  remove: (id) => data(api.delete(`/team-codes/${id}`)),
};

export const calendarEntriesApi = {
  range: (from, to) => data(api.get("/calendar-entries", { params: { from, to } })),
  forTarget: (id) => data(api.get("/calendar-entries", { params: { id } })),
  create: (body) => data(api.post("/calendar-entries", body)),
  update: (id, body) => data(api.patch(`/calendar-entries/${id}`, body)),
  remove: (id) => data(api.delete(`/calendar-entries/${id}`)),
};

export const teamAnalyticsApi = {
  matrix: (params) => data(api.get("/team-analytics", { params })),
  team: (id, params) => data(api.get(`/team-analytics/${id}`, { params })),
};
