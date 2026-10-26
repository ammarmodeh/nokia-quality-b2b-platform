// Times API endpoints against a server running on the LOCAL perf database (see seedPerfData.js).
// Usage: node scripts/perf/benchEndpoints.js [backendDir=.] [port=5077] [runs=7]
// Starts <backendDir>/server.js with a local MONGO_URI and its own JWT secret, then reports
// median latency and gzipped/raw payload size for each endpoint.
import { spawn } from "node:child_process";
import path from "node:path";
import zlib from "node:zlib";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const backendDir = path.resolve(process.argv[2] || ".");
const PORT = process.argv[3] || "5077";
const RUNS = Number(process.argv[4] || 7);
const MONGO_URI = "mongodb://127.0.0.1:27017/qops_perf";
const SECRET = "perf-local-secret";

await mongoose.connect(MONGO_URI);
const admin = await mongoose.connection.db.collection("users").findOne({ role: "Admin" });
await mongoose.disconnect();
const token = jwt.sign({ id: admin._id.toString() }, SECRET, { expiresIn: "1h" });

const server = spawn(process.execPath, ["server.js"], {
  cwd: backendDir,
  env: { ...process.env, PORT, MONGO_URI, JWT_SECRET: SECRET, NODE_ENV: "development", AWS_S3_BUCKET: "" },
  stdio: ["ignore", "pipe", "pipe"],
});
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("server did not start")), 90000);
  server.stderr.on("data", (d) => process.stderr.write(d));
  server.stdout.on("data", (d) => /running on port/i.test(String(d)) && (clearTimeout(t), resolve()));
});
await new Promise((r) => setTimeout(r, 1500)); // let mongoose finish connecting

const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
const now = new Date().toISOString();
const yearStart = new Date(new Date().getFullYear() - 1, 0, 1).toISOString();
const endpoints = (process.env.BENCH_PATHS || [
  "/api/tasks/get-all-tasks",
  "/api/tasks/get-all-tasks?view=summary",
  `/api/tasks/get-all-tasks?view=summary&from=${yearStart}`,
  `/api/tasks/get-all-tasks?view=summary&from=${weekAgo}&to=${now}`,
].join("|")).split("|");

const time = async (url, headers = {}) => {
  const t = performance.now();
  const res = await fetch(`http://127.0.0.1:${PORT}${url}`, { headers: { Authorization: `Bearer ${token}`, ...headers } });
  const buf = Buffer.from(await res.arrayBuffer());
  return { ms: performance.now() - t, status: res.status, raw: buf.length, etag: res.headers.get("etag") };
};
const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

try {
  for (const url of endpoints) {
    const first = await time(url);
    const runs = [];
    for (let i = 0; i < RUNS; i++) runs.push((await time(url)).ms);
    const body = await (await fetch(`http://127.0.0.1:${PORT}${url}`, { headers: { Authorization: `Bearer ${token}` } })).text();
    let rows = "?";
    try { rows = JSON.parse(body).length; } catch { /* not an array */ }
    const revalidate = first.etag ? await time(url, { "If-None-Match": first.etag }) : null;
    console.log(
      [`${url.replace(/from=[^&]+/, "from=…").replace(/to=[^&]+/, "to=…")}`, `status ${first.status}`, `rows ${rows}`, `median ${median(runs).toFixed(0)} ms`, `raw ${(first.raw / 1024).toFixed(0)} KB`, `gzip ${(zlib.gzipSync(body).length / 1024).toFixed(0)} KB`, revalidate ? `304-revalidate ${revalidate.status} ${revalidate.ms.toFixed(0)} ms` : "no etag"].join(" | ")
    );
  }
} finally {
  server.kill();
}
process.exit(0);
