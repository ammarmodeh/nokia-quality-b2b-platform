import http from 'k6/http';
import { check, sleep } from 'k6';

/*
  Command Prompt (CMD) example:

  set "BASE_URL=http://localhost:3000"
  set "PATHS=/,/auth,/dashboard"
  set "VUS=25"
  set "DURATION=1m"
  set "SLEEP=0.5"
  set "THRESHOLD_P95=1000"
  k6 run .\k6\website-performance.js

  Notes:
  - No spaces around =
  - Use set "VARIABLE=value"
  - BASE_URL should point to the frontend (e.g. localhost:3000)
*/

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
const paths = (__ENV.PATHS || '/,/auth,/dashboard,/fieldteam-login,/tasks-list')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);

const vus = __ENV.VUS ? Number(__ENV.VUS) : 25;
const stageDuration = __ENV.DURATION || '1m';
const sleepBetweenRequests = __ENV.SLEEP ? Number(__ENV.SLEEP) : 0.5;
const thresholdP95 = __ENV.THRESHOLD_P95 ? Number(__ENV.THRESHOLD_P95) : 1000;

console.log(`[k6 website config] BASE_URL=${baseUrl} PATHS=${paths.join(',')} VUS=${vus} DURATION=${stageDuration} SLEEP=${sleepBetweenRequests} THRESHOLD_P95=${thresholdP95}`);

export const options = {
  stages: [
    { duration: '20s', target: Math.ceil(vus * 0.3) },
    { duration: stageDuration, target: vus },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: [`p(95)<${thresholdP95}`],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

// function pickPath() {
//   return paths[Math.floor(Math.random() * paths.length)];
// }

export default function () {
  // const path = pickPath();
  const path = "/tasks-list";
  const res = http.get(`${baseUrl}${path}`);

  // console.log("res", res);

  const success = check(res,
    {
      'status is 200': (r) => r.status === 200,
      'body is not empty': (r) => !!r.body && r.body.length > 0,
      'returns HTML': (r) => {
        const body = (r.body || '').toString().toLowerCase();
        return body.includes('<!doctype html') || body.includes('id="root"') || body.includes('<html');
      },
    }
  );

  if (!success) {
    console.log(`Failed → ${path} | status: ${res.status} | duration: ${res.timings.duration.toFixed(1)}ms`);
  }

  sleep(sleepBetweenRequests);
}