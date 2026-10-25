import api from "./api";

const data = (p) => p.then((r) => r.data);

export const slaApi = {
  apply: (body) => data(api.post("/sla/apply", body)),
  forTarget: (kind, id) => data(api.get(`/sla/target/${kind}/${id}`)),
  renew: (id, body) => data(api.post(`/sla/${id}/renew`, body)),
  resolve: (id, body) => data(api.post(`/sla/${id}/resolve`, body)),
  list: (params) => data(api.get("/sla/list", { params })),
  notifications: () => data(api.get("/sla/notifications")),
  getNotifications: () => data(api.get("/sla/notifications")),
  teamPerformance: (teamId) => data(api.get(`/sla/team-performance/${teamId}`)),
  getTeamPerformance: (teamId) => data(api.get(`/sla/team-performance/${teamId}`)),
};
