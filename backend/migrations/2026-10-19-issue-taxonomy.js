// Issue taxonomy backfill (approved 2026-10-19). Reversible.
//
//   node migrations/2026-10-19-issue-taxonomy.js            # dry run (default): prints the plan, writes nothing
//   node migrations/2026-10-19-issue-taxonomy.js --apply    # writes; records everything it changed
//   node migrations/2026-10-19-issue-taxonomy.js --rollback # undoes exactly what --apply did
//
// Additive only: sets issueCategory / issueSubCategory / taxonomyBatch on records
// that don't have a category yet. Legacy fields (category, fromMain, fromSub,
// snagType) are never modified.
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { TAXONOMY, taxonomyForIssue, taxonomyForTask } from "../utils/taxonomy.js";

dotenv.config();
const BATCH = "issue-taxonomy-2026-10-19";
const MODE = process.argv.includes("--rollback") ? "rollback" : process.argv.includes("--apply") ? "apply" : "dry-run";
const DEACTIVATE = [
  { category: "TASK_CATEGORIES", value: "Others" },
  { category: "TASK_CATEGORIES", value: "Orange HC detractor" },
  { category: "TASK_CATEGORIES", value: "Nokia MS detractor" },
];
const label = (c, s) => [c, s].filter(Boolean).join(" · ");

await mongoose.connect(process.env.MONGO_URI);
const db = mongoose.connection.db;
const tasks = db.collection("tasks");
const issues = db.collection("customerissues");
const options = db.collection("dropdownoptions");
const logs = db.collection("migrationlogs");

const plan = async (col, fn, legacyKey) => {
  const docs = await col.find({ $or: [{ issueCategory: null }, { issueCategory: { $exists: false } }] }).project({ category: 1, fromMain: 1, fromSub: 1, from: 1, snagType: 1, slid: 1 }).toArray();
  const groups = new Map();
  const review = [];
  for (const d of docs) {
    const t = fn(d);
    const key = legacyKey(d);
    if (!t) {
      review.push({ _id: String(d._id), slid: d.slid, legacy: key });
      continue;
    }
    const g = `${key}  →  ${label(t.issueCategory, t.issueSubCategory)}`;
    if (!groups.has(g)) groups.set(g, { ...t, ids: [] });
    groups.get(g).ids.push(d._id);
  }
  return { groups, review, total: docs.length };
};

if (MODE === "rollback") {
  const log = await logs.findOne({ batch: BATCH, rolledBackAt: null }, { sort: { appliedAt: -1 } });
  if (!log) {
    console.log("Nothing to roll back for", BATCH);
  } else {
    const t = await tasks.updateMany({ taxonomyBatch: BATCH }, { $unset: { issueCategory: "", issueSubCategory: "", taxonomyBatch: "" } });
    const i = await issues.updateMany({ taxonomyBatch: BATCH }, { $unset: { issueCategory: "", issueSubCategory: "", taxonomyBatch: "" } });
    const del = log.createdOptionIds?.length ? await options.deleteMany({ _id: { $in: log.createdOptionIds } }) : { deletedCount: 0 };
    const re = log.deactivatedOptionIds?.length ? await options.updateMany({ _id: { $in: log.deactivatedOptionIds } }, { $set: { isActive: true } }) : { modifiedCount: 0 };
    for (const [col, name] of [[tasks, "issueCategory_1"], [issues, "issueCategory_1"]]) {
      if (log.createdIndexes?.includes(`${col.collectionName}.${name}`)) await col.dropIndex(name).catch(() => {});
    }
    await logs.updateOne({ _id: log._id }, { $set: { rolledBackAt: new Date() } });
    console.log(`Rolled back: tasks ${t.modifiedCount}, issues ${i.modifiedCount}, options removed ${del.deletedCount}, options reactivated ${re.modifiedCount}`);
  }
  await mongoose.disconnect();
  process.exit(0);
}

const taskPlan = await plan(tasks, taxonomyForTask, (d) => `task.category=${JSON.stringify(d.category ?? null)}`);
const issuePlan = await plan(issues, taxonomyForIssue, (d) => `fromMain/fromSub=${JSON.stringify(d.fromMain ?? "")}/${JSON.stringify(d.fromSub ?? "")}`);

const existing = await options.find({ category: { $in: ["ISSUE_TAXONOMY", "ISSUE_TAXONOMY_SUB"] } }).project({ category: 1, value: 1, parentValue: 1 }).toArray();
const has = (cat, value, parent) => existing.some((o) => o.category === cat && o.value === value && (parent === undefined || o.parentValue === parent));
const newOptions = [];
TAXONOMY.forEach((t, i) => {
  if (!has("ISSUE_TAXONOMY", t.category)) newOptions.push({ category: "ISSUE_TAXONOMY", value: t.category, label: t.category, order: i + 1, isActive: true, parentCategory: null, parentValue: null });
  t.subs.forEach((s, j) => {
    const value = `${t.category} · ${s}`;
    if (!has("ISSUE_TAXONOMY_SUB", value)) newOptions.push({ category: "ISSUE_TAXONOMY_SUB", value, label: s, order: (i + 1) * 10 + j, isActive: true, parentCategory: "ISSUE_TAXONOMY", parentValue: t.category });
  });
});
const toDeactivate = await options.find({ $or: DEACTIVATE, isActive: { $ne: false } }).project({ category: 1, value: 1 }).toArray();

console.log(`\n=== ${MODE.toUpperCase()} · ${BATCH} ===`);
for (const [name, p] of [["Tasks", taskPlan], ["Customer issues (OJO snags)", issuePlan]]) {
  console.log(`\n${name}: ${p.total} without a category`);
  for (const [g, v] of p.groups) console.log(`  ${String(v.ids.length).padStart(4)}  ${g}`);
  console.log(`  ${String(p.review.length).padStart(4)}  → review list (unmapped)`);
}
console.log(`\nDropdown lists to add: ${newOptions.length} (${newOptions.map((o) => `${o.category}:${o.value}`).join(", ") || "none"})`);
console.log(`Dropdown values to deactivate: ${toDeactivate.map((o) => `${o.category}:${o.value}`).join(", ") || "none"}`);

const review = [...taskPlan.review.map((r) => ({ ...r, collection: "tasks" })), ...issuePlan.review.map((r) => ({ ...r, collection: "customerissues" }))];
if (review.length) {
  const file = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), `${BATCH}-review.json`);
  fs.writeFileSync(file, JSON.stringify(review, null, 2));
  console.log(`\nReview list written to ${file}`);
}

if (MODE === "apply") {
  const counts = {};
  for (const [col, p] of [[tasks, taskPlan], [issues, issuePlan]]) {
    let n = 0;
    for (const v of p.groups.values()) {
      const r = await col.updateMany({ _id: { $in: v.ids }, $or: [{ issueCategory: null }, { issueCategory: { $exists: false } }] }, { $set: { issueCategory: v.issueCategory, issueSubCategory: v.issueSubCategory ?? null, taxonomyBatch: BATCH } });
      n += r.modifiedCount;
    }
    counts[col.collectionName] = n;
  }
  const now = new Date();
  const created = newOptions.length ? await options.insertMany(newOptions.map((o) => ({ ...o, createdAt: now, updatedAt: now }))) : { insertedIds: {} };
  const deact = toDeactivate.map((o) => o._id);
  if (deact.length) await options.updateMany({ _id: { $in: deact } }, { $set: { isActive: false, updatedAt: now } });
  const createdIndexes = [];
  for (const col of [tasks, issues]) {
    const idx = await col.indexes();
    if (!idx.some((i) => i.name === "issueCategory_1")) {
      await col.createIndex({ issueCategory: 1 });
      createdIndexes.push(`${col.collectionName}.issueCategory_1`);
    }
  }
  await logs.insertOne({
    batch: BATCH, appliedAt: now, rolledBackAt: null, counts,
    createdOptionIds: Object.values(created.insertedIds), deactivatedOptionIds: deact, createdIndexes,
  });
  console.log(`\nApplied: ${JSON.stringify(counts)}; options added ${Object.keys(created.insertedIds).length}; deactivated ${deact.length}; indexes ${createdIndexes.join(", ") || "none"}`);
} else {
  console.log("\nDry run only — nothing was written. Re-run with --apply to write.");
}
await mongoose.disconnect();
