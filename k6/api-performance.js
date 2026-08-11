import http from 'k6/http';
import { check, sleep } from 'k6';

/*
  cd "c:\Users\LENOVO\Desktop\Coding\B1 MERN Projects\32 FullstackMERN Stack Task Manager App - nokia-quality-task-tracker\Project"
    
  set "BASE_URL=http://localhost:5000"
  set "VUS=20"
  set "DURATION=1m"
  set "THRESHOLD_P95=800"
  set "LOGIN_EMAIL=ammarm.odeh@gmail.com"
  set "LOGIN_PASSWORD=A123654789***"

  k6 run .\k6\api-performance.js
*/

const baseUrl = __ENV.BASE_URL || 'http://localhost:5000';
const vus = __ENV.VUS ? Number(__ENV.VUS) : 30;
const stageDuration = __ENV.DURATION || '1m';
const thresholdP95 = __ENV.THRESHOLD_P95 ? Number(__ENV.THRESHOLD_P95) : 800;
const loginEmail = __ENV.LOGIN_EMAIL || '';
const loginPassword = __ENV.LOGIN_PASSWORD || '';

console.log(`[k6 api config] BASE_URL=${baseUrl} VUS=${vus} DURATION=${stageDuration} THRESHOLD_P95=${thresholdP95} LOGIN_EMAIL=${loginEmail ? 'SET' : 'NOT_SET'}`);

export const options = {
  stages: [
    { duration: '20s', target: Math.ceil(vus * 0.3) }, // warm-up
    { duration: stageDuration, target: vus },          // sustained load
    { duration: '20s', target: 0 },                     // ramp-down
  ],
  thresholds: {
    http_req_duration: [`p(95)<${thresholdP95}`],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

function buildHeaders(extra = {}, token = '') {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...extra,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}


function loginAndGetToken() {
  if (!loginEmail || !loginPassword) return '';

  const res = http.post(
    `${baseUrl}/api/users/login`,
    JSON.stringify({ email: loginEmail, password: loginPassword }),
    { headers: buildHeaders() }
  );

  if (res.status === 200) {
    const token = res.json('accessToken') || res.json('token');
    return token || '';
  }

  console.warn(`Login failed → status ${res.status} | body: ${res.body}`);
  return '';
}


export default function () {
  // 1. Health check (always runs)
  const healthRes = http.get(`${baseUrl}/api/health`);
  check(healthRes, {
    'health → 200': (r) => r.status === 200,
    'health → has status field': (r) => !!r.body && r.body.includes('status'),
  });

  // 2. Optional authenticated flow
  const token = loginEmail && loginPassword ? loginAndGetToken() : '';

  if (token) {
    const tasksRes = http.get(`${baseUrl}/api/tasks/get-all-tasks`, {
      headers: buildHeaders({}, token),
    });

    check(tasksRes, {
      'tasks → 200': (r) => r.status === 200,
    });
  }

  sleep(1);
}