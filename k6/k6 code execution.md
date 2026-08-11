# k6 Execution Flow Explanation (Step-by-Step)

This document explains exactly what happens when running:

```bash
k6 run .\k6\website-performance.js
```

using the provided k6 script.

---

# 1. k6 Starts Loading the Script

When k6 starts, it loads:

```
website-performance.js
```

The first executed lines:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
```

k6 loads:

- `http` → Used to send HTTP requests.
- `check()` → Used to validate responses.
- `sleep()` → Used to pause Virtual Users (VUs).

---

# 2. Environment Variables Are Loaded

Example command:

```cmd
set "BASE_URL=http://localhost:3000"
set "PATHS=/,/auth,/dashboard"
set "VUS=25"
set "DURATION=1m"
set "SLEEP=0.5"
set "THRESHOLD_P95=1000"

k6 run .\k6\website-performance.js
```

k6 exposes these values using:

```javascript
__ENV
```

---

# 3. Base URL Initialization

Code:

```javascript
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';
```

Since:

```
BASE_URL=http://localhost:3000
```

The result:

```javascript
baseUrl = "http://localhost:3000";
```

---

# 4. PATHS Processing

Code:

```javascript
const paths = (__ENV.PATHS || '/,/auth,/dashboard,/fieldteam-login,/tasks-list')
  .split(',')
  .map((p) => p.trim())
  .filter(Boolean);
```

Input:

```
PATHS=/,/auth,/dashboard
```

Execution:

## Step 1: Split

```javascript
.split(',')
```

Result:

```javascript
[
 "/",
 "/auth",
 "/dashboard"
]
```

---

## Step 2: Trim Spaces

```javascript
.map((p)=>p.trim())
```

Result:

```javascript
[
 "/",
 "/auth",
 "/dashboard"
]
```

---

## Step 3: Remove Empty Values

```javascript
.filter(Boolean)
```

Result:

```javascript
[
 "/",
 "/auth",
 "/dashboard"
]
```

Final:

```javascript
paths=[
 "/",
 "/auth",
 "/dashboard"
]
```

---

# 5. Variable Initialization

## Virtual Users

Code:

```javascript
const vus = __ENV.VUS ? Number(__ENV.VUS) : 25;
```

Environment:

```
VUS=25
```

Result:

```javascript
vus = 25;
```

---

## Duration

Code:

```javascript
const stageDuration = __ENV.DURATION || '1m';
```

Result:

```javascript
stageDuration="1m";
```

---

## Sleep Time

Code:

```javascript
const sleepBetweenRequests =
__ENV.SLEEP ? Number(__ENV.SLEEP) : 0.5;
```

Result:

```javascript
sleepBetweenRequests=0.5;
```

Meaning:

Each Virtual User waits:

```
500 milliseconds
```

between requests.

---

## Threshold

Code:

```javascript
const thresholdP95 =
__ENV.THRESHOLD_P95
? Number(__ENV.THRESHOLD_P95)
:1000;
```

Result:

```javascript
thresholdP95=1000;
```

Meaning:

95% of requests should complete under:

```
1000 ms
```

---

# 6. Console Output

This line executes:

```javascript
console.log(`[k6 website config] ...`);
```

Output:

```
[k6 website config]
BASE_URL=http://localhost:3000
PATHS=/,/auth,/dashboard
VUS=25
DURATION=1m
SLEEP=0.5
THRESHOLD_P95=1000
```

---

# 7. k6 Load Stages

Your configuration:

```javascript
export const options = {
  stages: [
    { duration: '20s', target: Math.ceil(vus * 0.3) },
    { duration: stageDuration, target: vus },
    { duration: '20s', target: 0 },
  ]
};
```

Since:

```
vus = 25
```

k6 converts it to:

```javascript
stages=[
 {
   duration:"20s",
   target:8
 },

 {
   duration:"1m",
   target:25
 },

 {
   duration:"20s",
   target:0
 }
]
```

---

# 8. Test Timeline

## Stage 1 - Ramp Up

Duration:

```
20 seconds
```

Target:

```
8 Virtual Users
```

Traffic:

```
0 users
   |
   |
   v
8 users
```

Purpose:

Gradually increase traffic.

---

## Stage 2 - Steady Load

Duration:

```
1 minute
```

Target:

```
25 Virtual Users
```

Traffic:

```
8 users
   |
   |
   v
25 users
```

k6 maintains:

```
25 concurrent users
```

---

## Stage 3 - Ramp Down

Duration:

```
20 seconds
```

Target:

```
0 users
```

Traffic:

```
25 users
   |
   |
   v
0 users
```

---

# 9. Threshold Rules

Configured:

```javascript
thresholds:{
 http_req_duration:[
   'p(95)<1000'
 ],

 http_req_failed:[
   'rate<0.01'
 ],

 checks:[
   'rate>0.99'
 ]
}
```

---

## Response Time

Requirement:

```
95% of requests must finish below 1000ms
```

Example:

For 10,000 requests:

```
9500 requests must be below 1000ms
```

---

## Failed Requests

Requirement:

```
HTTP failure rate < 1%
```

Example:

For 10,000 requests:

```
Less than 100 failed requests
```

---

## Checks

Requirement:

```
99% of checks must pass
```

Example:

For 10,000 checks:

```
Less than 100 failures
```

---

# 10. Virtual User Execution

Now k6 starts:

```javascript
export default function()
```

This function runs repeatedly for every Virtual User.

Execution flow:

```
HTTP Request
      |
      v
Validate Response
      |
      v
Sleep
      |
      v
Repeat
```

---

# 11. Path Selection

Current code:

```javascript
const path="/tasks-list";
```

Therefore every request goes to:

```
/tasks-list
```

Even though:

```
PATHS=/,/auth,/dashboard
```

was configured.

The random function is disabled:

```javascript
// const path = pickPath();
```

So actual traffic:

```
All users
    |
    v
GET /tasks-list
```

---

# 12. HTTP Request

Code:

```javascript
const res = http.get(`${baseUrl}${path}`);
```

Values:

```
baseUrl=http://localhost:3000

path=/tasks-list
```

k6 sends:

```
GET http://localhost:3000/tasks-list
```

---

# 13. Server Response Example

Frontend responds:

```
HTTP/1.1 200 OK
```

Example body:

```html
<!doctype html>
<html>
<div id="root"></div>
</html>
```

k6 stores:

```javascript
res={
 status:200,

 body:"<html>...</html>",

 timings:{
   duration:245
 }
}
```

---

# 14. Response Validation

k6 executes:

```javascript
check(res,{...})
```

Three checks run.

---

## Check 1: Status Code

Code:

```javascript
r.status === 200
```

Example:

```
200 === 200
```

Result:

```
PASS
```

---

## Check 2: Body Exists

Code:

```javascript
!!r.body && r.body.length > 0
```

Example:

```
body="<html>"
```

Length:

```
>0
```

Result:

```
PASS
```

---

## Check 3: HTML Response

Code:

```javascript
body.includes('<!doctype html')
```

The function checks whether the response contains:

```
<!doctype html
```

or:

```
id="root"
```

or:

```
<html
```

Example:

```html
<!doctype html>
<html>
<div id="root">
```

Result:

```
PASS
```

---

# 15. Failed Request Handling

If any check fails:

```javascript
if(!success)
```

runs:

```javascript
console.log(
`Failed → ${path}
status:${res.status}
duration:${res.timings.duration}ms`
);
```

Example:

```
Failed → /tasks-list
status:500
duration:1200ms
```

---

# 16. Sleep

After the request:

```javascript
sleep(0.5);
```

The Virtual User waits:

```
500ms
```

Then repeats.

---

# 17. Request Rate Estimation

One Virtual User:

```
1 request every 0.5 seconds
```

Approximately:

```
2 requests/sec
```

With:

```
25 users
```

Expected:

```
25 × 2

≈ 50 requests/sec
```

during steady load.

---

# 18. Example Final k6 Output

```
✓ status is 200
✓ body is not empty
✓ returns HTML


checks.........................: 100.00%

http_req_duration..............:
avg=180ms
p(95)=350ms

http_req_failed................:
0.00%

http_reqs......................:
5000

vus.............................:
25

vus_max.........................:
25
```

---

# 19. Pass / Fail Evaluation

## Response Time

Requirement:

```
p95 < 1000ms
```

Example:

```
p95 = 350ms
```

Result:

```
PASS ✅
```

---

## HTTP Failures

Requirement:

```
failure rate <1%
```

Example:

```
0%
```

Result:

```
PASS ✅
```

---

## Checks

Requirement:

```
checks >99%
```

Example:

```
100%
```

Result:

```
PASS ✅
```

---

# 20. Important Note About Current Script

Currently your test only tests:

```
GET /tasks-list
```

because:

```javascript
const path="/tasks-list";
```

is hardcoded.

Your configured:

```
PATHS=/,/auth,/dashboard
```

is not used.

To simulate real users:

Enable:

```javascript
const path = pickPath();
```

and restore:

```javascript
function pickPath(){
 return paths[
   Math.floor(
     Math.random()*paths.length
   )
 ];
}
```

Then traffic becomes:

```
User 1  → /
User 2  → /auth
User 3  → /dashboard
User 4  → /tasks-list
```

This creates a more realistic website user journey.