import http from 'k6/http';
import { check, sleep, group } from 'k6';

/*
  Full Lifecycle Performance Test
  ================================
  Simulates a complete user journey:
    1. Frontend  → Load HTML shell (Vite, port 3000)
    2. Backend   → Login → receive JWT token (Express, port 5000)
    3. Backend   → Fetch tasks from DB (MongoDB via Express)
    4. Backend   → Fetch a single task detail
    5. Frontend  → Load another page (dashboard)

  CMD usage:
    set "FRONTEND_URL=http://localhost:3000"
    set "BACKEND_URL=http://localhost:5000"
    set "LOGIN_EMAIL=ammarm.odeh@gmail.com"
    set "LOGIN_PASSWORD=A123654789***"
    set "VUS=10"
    set "DURATION=30s"
    set "THRESHOLD_P95=1500"
    k6 run .\k6\lifecycle-performance.js
*/

// ── Config ────────────────────────────────────────────────────────────────────
const FRONTEND = __ENV.FRONTEND_URL || 'http://localhost:3000';
const BACKEND = __ENV.BACKEND_URL || 'http://localhost:5000';
const EMAIL = __ENV.LOGIN_EMAIL || '';
const PASSWORD = __ENV.LOGIN_PASSWORD || '';
const VUS = __ENV.VUS ? Number(__ENV.VUS) : 10;
const DURATION = __ENV.DURATION || '30s';
const P95_MS = __ENV.THRESHOLD_P95 ? Number(__ENV.THRESHOLD_P95) : 1500;

console.log(
  `[lifecycle config] FRONTEND=${FRONTEND} BACKEND=${BACKEND} ` +
  `VUS=${VUS} DURATION=${DURATION} P95=${P95_MS}ms ` +
  `AUTH=${EMAIL ? 'YES' : 'NO (set LOGIN_EMAIL + LOGIN_PASSWORD env vars)'}`
);

// ── Thresholds & Stages ───────────────────────────────────────────────────────
export const options = {

  // Normal example (gradual ramp up/down):
  stages: [
    { duration: '15s', target: Math.ceil(VUS * 0.3) }, // ramp-up
    { duration: DURATION, target: VUS },                // sustained load
    { duration: '15s', target: 0 },                     // ramp-down
  ],

  // Stress example (keep climbing until the system struggles):
  // stages: [
  //   { duration: '30s', target: 20 },   // normal
  //   { duration: '10s', target: 200 },  // sudden spike
  //   { duration: '1m',  target: 200 },  // hold the spike briefly
  //   { duration: '10s', target: 20 },   // drop back
  //   { duration: '30s', target: 0 },
  // ]

  // Spike example (sudden burst):
  // stages: [
  //   { duration: '30s', target: 20 },   // normal
  //   { duration: '10s', target: 200 },  // sudden spike
  //   { duration: '1m', target: 200 },  // hold the spike briefly
  //   { duration: '10s', target: 20 },   // drop back
  //   { duration: '30s', target: 0 },
  // ],

  // You can keep the same thresholds and request logic; only the stages (and usually the VUS / duration env vars) need to change.
  // Summary: The three scripts are solid load / performance tests. They do not currently include stress or spike behaviour.

  thresholds: {
    http_req_duration: [`p(95)<${P95_MS}`],
    http_req_failed: ['rate<0.05'],
    checks: ['rate>0.90'],
    'http_req_duration{group:::1 - Load HTML page}': [`p(95)<${P95_MS}`],
    'http_req_duration{group:::2 - Authenticate}': ['p(95)<2000'],
    'http_req_duration{group:::3 - Fetch tasks (DB)}': ['p(95)<2000'],
    'http_req_duration{group:::4 - Task detail}': ['p(95)<1500'],
    'http_req_duration{group:::5 - Dashboard page}': [`p(95)<${P95_MS}`],
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonHeaders(token) {
  const h = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

function htmlHeaders() {
  return { Accept: 'text/html', 'User-Agent': 'k6-lifecycle-test' };
}

// ── Main VU function ──────────────────────────────────────────────────────────
export default function () {
  let firstTaskId = null;
  let token = '';

  // STEP 1 ▸ Frontend — Load the HTML shell
  group('1 - Load HTML page', () => {
    const res = http.get(`${FRONTEND}/`, { headers: htmlHeaders() });
    check(res, {
      '[frontend] status 200': (r) => r.status === 200,
      '[frontend] body not empty': (r) => r.body && r.body.length > 0,
      '[frontend] returns HTML': (r) => {
        const b = (r.body || '').toLowerCase();
        return b.includes('<!doctype html') || b.includes('<html') || b.includes('id="root"');
      },
    });
  });

  sleep(0.3);

  // STEP 2 ▸ Backend — Authenticate (login → JWT)
  group('2 - Authenticate', () => {
    if (!EMAIL || !PASSWORD) {
      console.warn('[lifecycle] Skipping auth — set LOGIN_EMAIL and LOGIN_PASSWORD env vars');
      return;
    }
    const res = http.post(
      `${BACKEND}/api/users/login`,
      JSON.stringify({ email: EMAIL, password: PASSWORD }),
      { headers: jsonHeaders() }
    );
    const ok = check(res, {
      '[auth] status 200': (r) => r.status === 200,
      '[auth] has accessToken': (r) => {
        try {
          const body = JSON.parse(r.body);
          return !!(body.accessToken || body.token);
        } catch { return false; }
      },
    });
    if (ok && res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        token = body.accessToken || body.token || '';
      } catch { token = ''; }
    }
  });

  sleep(0.2);

  // STEP 3 ▸ Backend → MongoDB — Fetch task list
  group('3 - Fetch tasks (DB)', () => {
    if (!token) return;
    const res = http.get(`${BACKEND}/api/tasks/get-tasks`, { headers: jsonHeaders(token) });
    check(res, {
      '[tasks] status 200': (r) => r.status === 200,
      '[tasks] has data array': (r) => {
        try {
          const body = JSON.parse(r.body);
          return Array.isArray(body) || Array.isArray(body.tasks) || Array.isArray(body.data);
        } catch { return false; }
      },
    });
    if (res.status === 200) {
      try {
        const body = JSON.parse(res.body);
        const list = Array.isArray(body) ? body : (body.tasks || body.data || []);
        if (list.length > 0) firstTaskId = list[0]._id || list[0].id || null;
      } catch { /* ignore */ }
    }
  });

  sleep(0.2);

  // STEP 4 ▸ Backend → MongoDB — Fetch single task detail
  group('4 - Task detail', () => {
    if (!token || !firstTaskId) return;
    const res = http.get(`${BACKEND}/api/tasks/get-task/${firstTaskId}`, {
      headers: jsonHeaders(token),
    });
    check(res, {
      '[task-detail] status 200': (r) => r.status === 200,
      '[task-detail] has _id': (r) => {
        try { return !!JSON.parse(r.body)._id; } catch { return false; }
      },
    });
  });

  sleep(0.2);

  // STEP 5 ▸ Frontend — Navigate to dashboard
  group('5 - Dashboard page', () => {
    const res = http.get(`${FRONTEND}/dashboard`, { headers: htmlHeaders() });
    check(res, {
      '[dashboard] status 200': (r) => r.status === 200,
      '[dashboard] returns HTML': (r) => {
        const b = (r.body || '').toLowerCase();
        return b.includes('<!doctype html') || b.includes('id="root"');
      },
    });
  });

  sleep(0.5);
}
