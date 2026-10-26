// Integration tests on a LOCAL MongoDB only (default mongodb://127.0.0.1:27017/qops_local_tests).
// Never imports server.js, so the .env production MONGO_URI is never used. Run: npm run test:local
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";

const URI = process.env.LOCAL_TEST_MONGO_URI || "mongodb://127.0.0.1:27017/qops_local_tests";
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(URI)) throw new Error(`Refusing to run against a non-local database: ${URI}`);
process.env.JWT_SECRET = "local-test-secret";

const { default: maintenanceRoutes } = await import("../../routes/maintenanceRoutes.js");
const { default: teamTrendsRoutes } = await import("../../routes/teamTrendsRoutes.js");
const { UserSchema } = await import("../../models/userModel.js");
const { TaskSchema } = await import("../../models/taskModel.js");
const { TaskTicket } = await import("../../models/taskTicketModel.js");
const { FieldTeamsSchema } = await import("../../models/fieldTeamsModel.js");
const { default: TeamSamplesToken } = await import("../../models/teamSamplesTokenModel.js");
const { default: TeamOnlineData } = await import("../../models/teamOnlineDataModel.js");
const M = await import("../../models/maintenanceModels.js");

const app = express();
app.use(express.json());
app.use("/api/maintenance", maintenanceRoutes);
app.use("/api/team-trends", teamTrendsRoutes);

let admin;
let member;
const auth = (u) => ({ Authorization: `Bearer ${jwt.sign({ id: String(u._id) }, process.env.JWT_SECRET)}` });

// Counts of the existing (non-maintenance) collections, to prove nothing leaks into them.
const legacyCounts = async () => ({
  tasks: await TaskSchema.countDocuments(),
  tickets: await TaskTicket.countDocuments(),
  fieldTeams: await FieldTeamsSchema.countDocuments(),
  teamSamples: await TeamSamplesToken.countDocuments(),
  teamOnline: await TeamOnlineData.countDocuments(),
});

beforeAll(async () => {
  await mongoose.connect(URI);
  await mongoose.connection.db.dropDatabase();
  await Promise.all([M.MaintenanceTeam, M.MaintenanceSurveySample, M.MaintenanceTask, M.MaintenanceTicket].map((m) => m.syncIndexes()));
  [admin, member] = await UserSchema.create([
    { name: "Admin", email: "admin@local.test", password: "Passw0rd!x", role: "Admin", color: "#6C47FF", phoneNumber: "+962790000001" },
    { name: "Member", email: "member@local.test", password: "Passw0rd!x", role: "Member", color: "#16A34A", phoneNumber: "+962790000002" },
  ]);
  // A pre-existing DVOC Installation world that must stay untouched.
  const ft = await FieldTeamsSchema.create({ teamName: "Install Alpha", teamCompany: "REACH" }).catch(() => null);
  await TaskSchema.collection.insertMany([
    { slid: "S1", requestNumber: 9001, teamName: "Install Alpha", teamId: ft?._id, interviewDate: new Date("2026-09-10"), teamAccountability: ["Yes"], responsible: ["Reach"], evaluationScore: 3 },
    { slid: "S2", requestNumber: 9002, teamName: "Install Alpha", interviewDate: new Date("2026-09-12"), teamAccountability: ["No"], responsible: ["Customer"], evaluationScore: 5 },
    { slid: "S3", requestNumber: 9003, teamName: "Install Bravo", interviewDate: new Date("2026-09-15"), teamAccountability: ["Yes"], responsible: ["OJO"], evaluationScore: 2 },
  ]);
  await TeamSamplesToken.create([{ year: 2026, month: 9, teamName: "Install Alpha", sampleSize: 21 }, { year: 2026, month: 9, teamName: "Install Bravo", sampleSize: 10 }]);
  await TeamOnlineData.create([{ year: 2026, month: 9, teamName: "Install Alpha", onlineTransactions: 400 }]);
}, 60000);

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

describe("DVOC Maintenance — end to end", () => {
  let before;
  let team;
  let sample;
  let task;

  beforeAll(async () => {
    before = await legacyCounts();
  });

  it("rejects unauthenticated requests", async () => {
    await request(app).get("/api/maintenance/teams").expect(401);
  });

  it("creates a maintenance team with members and rejects a same-name duplicate (case-insensitive)", async () => {
    const res = await request(app).post("/api/maintenance/teams").set(auth(member)).send({ teamName: "Maint North", teamCode: "mn1", supervisor: "Sara", shift: "Morning", coverageAreas: "Irbid, Ramtha", members: [{ name: "Ali", role: "Technician", phone: "0790000000" }, { name: "" }] }).expect(201);
    team = res.body;
    expect(team).toMatchObject({ teamName: "Maint North", teamCode: "MN1", status: "Active", coverageAreas: ["Irbid", "Ramtha"] });
    expect(team.members).toHaveLength(1);
    const dup = await request(app).post("/api/maintenance/teams").set(auth(member)).send({ teamName: "maint north" }).expect(409);
    expect(dup.body.fields.teamName).toBeTruthy();
    await request(app).post("/api/maintenance/teams").set(auth(member)).send({ teamName: "  " }).expect(400);
  });

  it("enters one survey sample entry per team per month, with validation", async () => {
    const bad = await request(app).post("/api/maintenance/samples").set(auth(member)).send({ team: team._id, year: 2026, month: 9, sampleSize: 10, promoters: 8, detractors: 5 }).expect(400);
    expect(bad.body.fields.sampleSize).toMatch(/exceed/);
    const res = await request(app).post("/api/maintenance/samples").set(auth(member)).send({ team: team._id, year: 2026, month: 9, sampleSize: 40, detractors: 3 }).expect(201);
    sample = res.body;
    const dup = await request(app).post("/api/maintenance/samples").set(auth(member)).send({ team: team._id, year: 2026, month: 9, sampleSize: 5 }).expect(409);
    expect(dup.body.existingId).toBe(sample._id);
    await request(app).put(`/api/maintenance/samples/${sample._id}`).set(auth(member)).send({ sampleSize: 42 }).expect(200);
    const list = await request(app).get("/api/maintenance/samples?year=2026").set(auth(member)).expect(200);
    expect(list.body[0]).toMatchObject({ sampleSize: 42, team: { teamName: "Maint North" } });
  });

  it("creates a task once even when the form is submitted twice (idempotency key)", async () => {
    const body = { requestKey: "form-123", slid: "int0419303", customerName: "Customer", team: team._id, surveySample: sample._id, priority: "High", evaluationScore: 4, rca: [{ reason: "Signal", teamAccountability: "Yes" }, { reason: "", teamAccountability: "Not specified" }] };
    const [a, b] = await Promise.all([request(app).post("/api/maintenance/tasks").set(auth(member)).send(body), request(app).post("/api/maintenance/tasks").set(auth(member)).send(body)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    task = (a.status === 201 ? a : b).body;
    expect(task).toMatchObject({ slid: "INT0419303", status: "Todo", team: { teamName: "Maint North" } });
    expect(task.taskNumber).toMatch(/^MT-\d{4}-[A-Z0-9]{5}$/);
    expect(task.rca).toHaveLength(1);
    expect(await M.MaintenanceTask.countDocuments()).toBe(1);
  });

  it("warns about a second open task for the same SLID and validates references", async () => {
    const dup = await request(app).post("/api/maintenance/tasks").set(auth(member)).send({ slid: "INT0419303", team: team._id }).expect(409);
    expect(dup.body.code).toBe("OPEN_TASK_EXISTS");
    const other = await request(app).post("/api/maintenance/teams").set(auth(member)).send({ teamName: "Maint South" }).expect(201);
    const wrong = await request(app).post("/api/maintenance/tasks").set(auth(member)).send({ slid: "X1", team: other.body._id, surveySample: sample._id }).expect(400);
    expect(wrong.body.fields.surveySample).toMatch(/another team/);
    await request(app).post("/api/maintenance/tasks").set(auth(member)).send({ slid: "X2", team: "nope" }).expect(400);
  });

  it("records processing steps that move the task status, atomically and idempotently", async () => {
    const step1 = { requestKey: "tk-1", transactionType: "contact", transactionState: "appt_set", status: "In Progress", note: "Called", eventDate: "2026-10-01" };
    const r1 = await request(app).post(`/api/maintenance/tasks/${task._id}/tickets`).set(auth(member)).send(step1).expect(201);
    expect(r1.body).toMatchObject({ transactionType: "CONTACT", transactionState: "APPT_SET", previousStatus: "Todo" });
    expect(r1.body.ticketId).toMatch(/^MQ-[A-Z0-9]{8}$/);
    const again = await request(app).post(`/api/maintenance/tasks/${task._id}/tickets`).set(auth(member)).send(step1).expect(200);
    expect(again.body.duplicate).toBe(true);
    await request(app).post(`/api/maintenance/tasks/${task._id}/tickets`).set(auth(member)).send({ transactionType: "", status: "Closed" }).expect(400);
    const r2 = await request(app).post(`/api/maintenance/tasks/${task._id}/tickets`).set(auth(admin)).send({ transactionType: "RESOLVE", transactionState: "ISSUE_RESOLVED", status: "Closed", eventDate: "2026-10-03" }).expect(201);

    let t = (await request(app).get(`/api/maintenance/tasks/${task._id}`).set(auth(member)).expect(200)).body;
    expect(t).toMatchObject({ status: "Closed", ticketCount: 2 });
    expect(t.closedAt).toBeTruthy();
    expect(t.tickets.map((x) => x.transactionType)).toEqual(["CONTACT", "RESOLVE"]);
    expect(t.history.some((h) => h.action === "status")).toBe(true);

    // Only the recorder or an admin may edit; a member can't edit the admin's step.
    await request(app).put(`/api/maintenance/tickets/${r2.body._id}`).set(auth(member)).send({ note: "x" }).expect(403);
    // Deleting the latest step (admin) puts the task back to the status the remaining step set.
    await request(app).delete(`/api/maintenance/tickets/${r2.body._id}`).set(auth(member)).expect(403);
    await request(app).delete(`/api/maintenance/tickets/${r2.body._id}`).set(auth(admin)).expect(200);
    t = (await request(app).get(`/api/maintenance/tasks/${task._id}`).set(auth(member)).expect(200)).body;
    expect(t).toMatchObject({ status: "In Progress", ticketCount: 1, closedAt: null });
  });

  it("lists tasks with server-side pagination, search and status counts", async () => {
    for (let i = 0; i < 4; i++) await request(app).post("/api/maintenance/tasks").set(auth(member)).send({ slid: `PAGE${i}`, team: team._id }).expect(201);
    const p1 = (await request(app).get("/api/maintenance/tasks?limit=2&page=1").set(auth(member)).expect(200)).body;
    expect(p1).toMatchObject({ total: 5, pages: 3, page: 1 });
    expect(p1.rows).toHaveLength(2);
    const s = (await request(app).get("/api/maintenance/tasks?q=page3").set(auth(member)).expect(200)).body;
    expect(s.rows.map((r) => r.slid)).toEqual(["PAGE3"]);
    const st = (await request(app).get("/api/maintenance/tasks?status=Todo").set(auth(member)).expect(200)).body;
    expect(st.total).toBe(4);
    expect(st.statusCounts).toMatchObject({ Todo: 4, "In Progress": 1 });
    const q = (await request(app).get("/api/maintenance/processing").set(auth(member)).expect(200)).body;
    expect(q.find((x) => x.slid === "INT0419303").lastStep.transactionType).toBe("CONTACT");
  });

  it("protects history: referenced teams/samples can't be deleted; deletes are admin-only", async () => {
    await request(app).delete(`/api/maintenance/teams/${team._id}`).set(auth(member)).expect(403);
    const t = await request(app).delete(`/api/maintenance/teams/${team._id}`).set(auth(admin)).expect(409);
    expect(t.body.message).toMatch(/Inactive/);
    await request(app).delete(`/api/maintenance/samples/${sample._id}`).set(auth(admin)).expect(409);
    await request(app).put(`/api/maintenance/teams/${team._id}`).set(auth(member)).send({ status: "Inactive" }).expect(200);
    const inactive = await request(app).post("/api/maintenance/tasks").set(auth(member)).send({ slid: "NEW1", team: team._id }).expect(400);
    expect(inactive.body.fields.team).toMatch(/inactive/);
    const del = await request(app).delete(`/api/maintenance/tasks/${task._id}`).set(auth(admin)).expect(200);
    expect(del.body.tickets).toBe(1);
    expect(await M.MaintenanceTicket.countDocuments({ task: task._id })).toBe(0);
    const audit = await M.MaintenanceAudit.find({ entityId: task._id, action: "delete" }).lean();
    expect(audit).toHaveLength(1);
  });

  it("never writes to the existing DVOC / Teams / Q-Ops collections", async () => {
    expect(await legacyCounts()).toEqual(before);
    const names = (await mongoose.connection.db.listCollections().toArray()).map((c) => c.name);
    expect(names.filter((n) => n.startsWith("maintenance_")).sort()).toEqual(["maintenance_audit_logs", "maintenance_survey_samples", "maintenance_tasks", "maintenance_teams", "maintenance_tickets"]);
  });
});

describe("Teams Trends API", () => {
  it("ranks teams by the selected metric using existing formulas, excluding maintenance data", async () => {
    const q = { from: "2026-09-01T00:00:00.000Z", to: "2026-09-30T23:59:59.999Z", months: "2026-9" };
    const res = (await request(app).get("/api/team-trends").query({ ...q, metric: "perSample" }).set(auth(member)).expect(200)).body;
    const alpha = res.rows.find((r) => r.teamName === "Install Alpha");
    const bravo = res.rows.find((r) => r.teamName === "Install Bravo");
    // Alpha: 1 accountable, 1 not → 1 / (21 − 1) = 5%; Bravo: 1 / 10 = 10% → Bravo is worse.
    expect(alpha).toMatchObject({ dvoc: 2, accountable: 1, reachAccountable: 1, perSamplePct: 5, perOnlinePct: 0.25 });
    expect(bravo).toMatchObject({ accountable: 1, perSamplePct: 10, perOnlinePct: null, rank: 1 });
    expect(res.rows.some((r) => /maint/i.test(r.teamName))).toBe(false);
    const reach = (await request(app).get("/api/team-trends").query({ ...q, metric: "reach" }).set(auth(member)).expect(200)).body;
    expect(reach.rows[0].teamName).toBe("Install Alpha");
  });

  it("gives no rates for partial-month periods and validates dates", async () => {
    const res = (await request(app).get("/api/team-trends").query({ from: "2026-09-07T00:00:00.000Z", to: "2026-09-13T23:59:59.999Z" }).set(auth(member)).expect(200)).body;
    expect(res.ratesAvailable).toBe(false);
    expect(res.rows.every((r) => r.perSamplePct === null)).toBe(true);
    expect(res.summary.accountable).toBe(1);
    await request(app).get("/api/team-trends").query({ from: "nope", to: "2026-09-13" }).set(auth(member)).expect(400);
  });
});
