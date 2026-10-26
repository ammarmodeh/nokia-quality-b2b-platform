// Seeds a LOCAL MongoDB with a production-sized synthetic dataset for load-time benchmarks.
// Usage: node scripts/perf/seedPerfData.js [mongodb://127.0.0.1:27017/qops_perf] [tasks=6000]
// Refuses any non-local URI so it can never touch the production database.
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Local-only test login for browser checks against this dataset.
export const PERF_ADMIN = { email: "perf0@example.test", password: "perf-local-123" };

const uri = process.argv[2] || "mongodb://127.0.0.1:27017/qops_perf";
const TASKS = Number(process.argv[3] || 6000);
if (!/^mongodb:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//.test(uri)) {
  console.error("Refusing to seed a non-local database:", uri);
  process.exit(1);
}

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const words = "fiber signal router slow drop install technician late cable ont wifi speed customer visit called resolved".split(" ");
const text = (n) => Array.from({ length: n }, () => pick(words)).join(" ");
const daysAgo = (d) => new Date(Date.now() - d * 864e5);

await mongoose.connect(uri);
const passwordHash = await bcrypt.hash(PERF_ADMIN.password, 10);
const db = mongoose.connection.db;
for (const c of ["tasks", "tasktickets", "users", "fieldteams"]) await db.collection(c).deleteMany({});

const users = Array.from({ length: 25 }, (_, i) => ({ _id: new mongoose.Types.ObjectId(), name: `User ${i}`, email: `perf${i}@example.test`, role: i === 0 ? "Admin" : "Member", password: passwordHash, isActive: true, createdAt: new Date(), updatedAt: new Date() }));
await db.collection("users").insertMany(users);
const teams = Array.from({ length: 40 }, (_, i) => ({ _id: new mongoose.Types.ObjectId(), teamName: `Team ${String(i).padStart(2, "0")}`, teamCompany: pick(["REACH", "Nokia", "Partner A"]), createdAt: new Date(), updatedAt: new Date() }));
await db.collection("fieldteams").insertMany(teams);

const tasks = [];
for (let i = 0; i < TASKS; i++) {
  const team = pick(teams);
  const interview = daysAgo(Math.random() * 900);
  tasks.push({
    _id: new mongoose.Types.ObjectId(),
    slid: `SL${100000 + i}`, requestNumber: 500000 + i, customerName: `Customer ${i}`, contactNumber: `07${Math.floor(Math.random() * 1e8)}`,
    governorate: pick(["Amman", "Irbid", "Zarqa"]), district: "D1", customerType: "Residential",
    evaluationScore: Math.ceil(Math.random() * 8), customerFeedback: text(40), closureComment: text(25), gaiaContent: text(110),
    reason: [pick(words)], subReason: [pick(words)], rootCause: [pick(words)], teamAccountability: [pick(["Yes", "No"])], responsible: [pick(words)],
    itnRelated: ["No"], relatedToSubscription: ["No"], scoringKeys: ["a", "b"], customFields: [{ key: "k", value: text(10) }],
    secondCallStatus: "Done", secondCallCategory: pick(words), secondCallAction: text(8), secondCallRootCause: text(6),
    teamName: team.teamName, teamId: team._id, teamCompany: team.teamCompany,
    interviewDate: interview, pisDate: daysAgo(Math.random() * 900), contractDate: daysAgo(Math.random() * 900),
    priority: pick(["High", "Medium", "Low"]), status: pick(["Todo", "In Progress", "Closed"]), validationStatus: "Validated",
    assignedTo: [pick(users)._id], whomItMayConcern: [pick(users)._id, pick(users)._id], createdBy: pick(users)._id,
    readBy: users.slice(0, 12).map((u) => ({ userId: u._id, readAt: new Date() })),
    subTasks: [{ title: "Call", note: text(15), status: "Closed", checkpoints: [{ name: "c1", checked: true, score: 50 }] }],
    createdAt: interview, updatedAt: interview,
  });
}
await db.collection("tasks").insertMany(tasks);

const tickets = [];
for (const t of tasks) {
  const n = Math.floor(Math.random() * 5);
  for (let k = 0; k < n; k++) {
    const ts = new Date(t.createdAt.getTime() + k * 36e5);
    tickets.push({ taskId: t._id, taskType: "Task", ticketId: `GAIA-${t.slid}-${k}`, status: "Done", mainCategory: pick(["Called", "Visited", "Resolved"]), eventDate: ts, timestamp: ts, recordedBy: pick(users)._id, note: text(30), transactionType: "TT", transactionState: "Closed", unfReasonCode: null, createdAt: ts, updatedAt: ts });
  }
}
await db.collection("tasktickets").insertMany(tickets);
console.log(`Seeded ${tasks.length} tasks, ${tickets.length} tickets, ${users.length} users, ${teams.length} teams into ${uri}`);
console.log("Admin user id for benchmark tokens:", users[0]._id.toString());
await mongoose.disconnect();
