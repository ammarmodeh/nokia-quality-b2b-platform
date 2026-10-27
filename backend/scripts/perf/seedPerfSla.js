// Adds synthetic SLA records to the LOCAL perf database (run seedPerfData.js first).
// Usage: node scripts/perf/seedPerfSla.js [mongodb://127.0.0.1:27017/qops_perf] [count=800]
// Refuses any non-local URI.
import mongoose from "mongoose";

const uri = process.argv[2] || "mongodb://127.0.0.1:27017/qops_perf";
const COUNT = Number(process.argv[3] || 800);
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(uri)) {
  console.error("Refusing to seed a non-local database:", uri);
  process.exit(1);
}

const H = 3600 * 1000;
const pick = (a) => a[Math.floor(Math.random() * a.length)];
await mongoose.connect(uri);
const db = mongoose.connection.db;
await db.collection("sla_records").deleteMany({});
const tasks = await db.collection("tasks").aggregate([{ $sample: { size: COUNT } }, { $project: { slid: 1, customerName: 1, teamId: 1, teamName: 1 } }]).toArray();
// Some teams are much slower than others, so the ranking has a shape.
const slowness = new Map();
const now = Date.now();
const docs = tasks.map((t) => {
  const key = String(t.teamId);
  if (!slowness.has(key)) slowness.set(key, Math.random() * 1.6 + 0.2);
  const slow = slowness.get(key);
  const slaHours = pick([4, 8, 24, 24, 48]);
  const start = new Date(now - Math.random() * 300 * 24 * H);
  const target = new Date(start.getTime() + slaHours * H);
  const roll = Math.random();
  let status = "met";
  let responseDate = null;
  let noResponse = false;
  let teamExempt = false;
  if (roll < 0.05) teamExempt = true;
  if (roll < 0.04 * slow) noResponse = true;
  const respHours = slaHours * (0.2 + Math.random() * 1.6 * slow);
  if (!noResponse && target.getTime() < now - 6 * H && Math.random() > 0.08) responseDate = new Date(start.getTime() + respHours * H);
  if (noResponse) status = teamExempt ? "met" : "breached";
  else if (responseDate) status = respHours <= slaHours || teamExempt ? "met" : "breached";
  else status = "active";
  return {
    target: { kind: "task", id: t._id, tableId: null },
    slid: t.slid,
    title: t.customerName,
    issueCategory: pick(["DVOC", "DVOC", "OJO Snags"]),
    issueSubCategory: pick(["Installation", "Installation", "Maintenance"]),
    fieldTeamId: t.teamId,
    teamName: t.teamName,
    slaHours,
    startDate: start,
    ticketCreationDate: start,
    targetDate: target,
    warningThresholdHours: 4,
    status,
    priority: pick(["High", "Medium", "Medium", "Low", "Critical"]),
    responseDate,
    noResponse,
    isBreached: status === "breached",
    teamExempt,
    resolvedAt: responseDate,
    renewals: [],
    createdAt: start,
    updatedAt: start,
  };
});
await db.collection("sla_records").insertMany(docs);
console.log(`Seeded ${docs.length} SLA records into ${uri}`);
await mongoose.disconnect();
