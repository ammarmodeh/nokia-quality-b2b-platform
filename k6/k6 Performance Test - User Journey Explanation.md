# k6 Performance Test - User Journey Explanation

## 1. What This Test Is Trying to Simulate

This test models a **real user journey** across both the frontend and backend layers.

The goal is not only to test individual API endpoints, but to simulate how a real user interacts with the complete application.

| Step | User Action | Component |
|---|---|---|
| 1 | Open the application (load HTML shell) | Frontend (`FRONTEND_URL`, e.g. Vite running on port 3000) |
| 2 | Login and receive JWT token | Backend (`BACKEND_URL`, e.g. Express running on port 5000) |
| 3 | Fetch list of tasks | Backend → Database (MongoDB) |
| 4 | Open a specific task details page | Backend → Database (MongoDB) |
| 5 | Navigate to dashboard page | Frontend |

Each **Virtual User (VU)** repeats this complete flow continuously while the test is running.

A Virtual User behaves like a real user:

```text
Open Website
      ↓
Login
      ↓
Load Data
      ↓
View Details
      ↓
Navigate
      ↓
Repeat
```

---

# 2. How k6 Executes the Test

A k6 test follows a lifecycle controlled by the configured stages.

## Test Lifecycle

```text
k6 starts
    |
    |
    ├── Reads configuration
    │      ├── stages
    │      ├── thresholds
    │      └── environment variables
    |
    |
    ├── Stage 1: Ramp-up (15 seconds)
    │      VUs increase from 0 → 30% of configured users
    |
    |
    ├── Stage 2: Sustained Load
    │      Hold the target number of concurrent users
    │      Duration controlled by DURATION variable
    |
    |
    ├── Stage 3: Ramp-down (15 seconds)
    │      VUs decrease from full load → 0
    |
    |
    └── Test finishes
           |
           └── Threshold evaluation
                 |
                 ├── PASS
                 └── FAIL
```

---

# Virtual User Execution Flow

Inside every Virtual User, the:

```javascript
export default function()
```

runs repeatedly.

## User Journey Steps

---

## Step 1 - Load Frontend

Request:

```http
GET /
```

Actions:

- Opens the frontend application
- Checks HTTP status
- Validates HTML response

Example:

```text
Frontend URL:
https://example.com/
```

---

## Step 2 - Authenticate User

Request:

```http
POST /api/users/login
```

Actions:

- Sends login credentials
- Receives JWT token
- Stores token for authenticated requests

Example:

```http
Authorization:
Bearer <JWT_TOKEN>
```

---

## Step 3 - Retrieve Tasks

Request:

```http
GET /api/tasks/get-tasks
```

Actions:

- Sends authenticated request
- Retrieves task list
- Extracts first task ID

Flow:

```text
Backend
   |
   |
MongoDB
   |
   |
Task List Response
```

---

## Step 4 - Open Task Details

Request:

```http
GET /api/tasks/get-task/:id
```

Actions:

- Requests details for a specific task
- Tests backend processing
- Tests database lookup performance

---

## Step 5 - Open Dashboard

Request:

```http
GET /dashboard
```

Actions:

- Loads dashboard page
- Validates frontend routing

---

# Think Time Between Actions

The script uses:

```javascript
sleep()
```

to simulate real human behaviour.

Example:

```text
Login
   |
   | wait 0.2 seconds
   |
Load Tasks
   |
   | wait 0.2 seconds
   |
Open Task
```

Without sleep:

- Users become unrealistic request generators
- Backend receives artificial traffic spikes

---

# k6 Groups

The script uses:

```javascript
group()
```

Example:

```javascript
group('Login', () => {
    http.post(...)
})
```

Important:

`group()` does NOT change execution.

It only helps organize reports.

Example:

```text
Login
 └── p95 response time: 300ms

Get Tasks
 └── p95 response time: 900ms

Dashboard
 └── p95 response time: 200ms
```

This helps identify which part of the system is slow.

---

# 3. Configuration and Thresholds

## Load Configuration

Example:

```javascript
stages: [

  {
    duration: '15s',
    target: Math.ceil(VUS * 0.3)
  },

  {
    duration: DURATION,
    target: VUS
  },

  {
    duration: '15s',
    target: 0
  }

]
```

Meaning:

| Stage | Purpose |
|---|---|
| Ramp-up | Gradually increase users |
| Main load | Test normal expected traffic |
| Ramp-down | Release traffic gradually |

---

# Success Criteria

The test passes only if all thresholds are satisfied.

---

## 1. Response Time

Example:

```javascript
http_req_duration:
[
  'p(95)<1500'
]
```

Meaning:

95% of requests must complete faster than:

```text
1500 milliseconds
```

Example:

```text
100 requests:

95 requests < 1500ms ✅

5 requests can be slower
```

---

## 2. Failed Requests

Example:

```javascript
http_req_failed:
[
  'rate<0.05'
]
```

Meaning:

Less than:

```text
5%
```

of requests can fail.

Example:

```text
10,000 requests

Allowed failures:
<500 requests
```

---

## 3. Successful Checks

Example:

```javascript
checks:
[
  'rate>0.90'
]
```

Meaning:

More than:

```text
90%
```

of validations must pass.

---

# Environment Variables

The test behaviour is controlled using environment variables:

| Variable | Purpose |
|---|---|
| FRONTEND_URL | Frontend application URL |
| BACKEND_URL | API server URL |
| LOGIN_EMAIL | Test account username |
| LOGIN_PASSWORD | Test account password |
| VUS | Number of virtual users |
| DURATION | Main test duration |
| THRESHOLD_P95 | Maximum acceptable response time |

Example:

```bash
k6 run \
-e FRONTEND_URL=https://app.com \
-e BACKEND_URL=https://api.app.com \
-e VUS=100 \
-e DURATION=5m \
test.js
```

---

# 4. Important Behaviour Details

## Authentication Is Optional

If:

```text
LOGIN_EMAIL
LOGIN_PASSWORD
```

are not provided:

- Login step is skipped
- API authentication steps are skipped

---

## Login Happens Every Iteration

Every Virtual User performs:

```text
Login
 ↓
Get Token
 ↓
Use Token
 ↓
Repeat
```

This is realistic but increases load on:

```text
Authentication service
Database
```

For very large tests, tokens may be reused to reduce authentication pressure.

---

## Task ID Selection

The script gets:

```text
firstTaskId
```

from:

```http
GET /api/tasks/get-tasks
```

Then:

```http
GET /api/tasks/get-task/:id
```

runs only if a task exists.

---

## Sleep Creates Realistic Behaviour

Example:

```javascript
sleep(1)
```

represents:

- User reading information
- User thinking
- User clicking next action

---

## Current Test Type

The current configuration represents:

```text
Normal Load Test
```

It simulates expected production traffic.

Other possible patterns:

| Test Type | Purpose |
|---|---|
| Load Test | Validate normal expected users |
| Stress Test | Find breaking point |
| Spike Test | Test sudden traffic increase |
| Soak Test | Test long duration stability |

---

# 5. Simple k6 Example

Create:

```text
simple.js
```

with:

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';


export const options = {

  vus: 5,

  duration: '20s',

  thresholds: {

    http_req_duration: [
      'p(95)<500'
    ],

    http_req_failed: [
      'rate<0.01'
    ],

  },

};


export default function () {


  const response = http.get(
    'https://test.k6.io'
  );


  check(response, {

    'status is 200':
      (r) => r.status === 200,


    'body contains text':
      (r) =>
      r.body.includes(
        'Collection of simple web-pages'
      ),

  });


  sleep(1);

}
```

---

# Running the Test

Command:

```bash
k6 run simple.js
```

---

# What Happens During Execution

```text
5 Virtual Users start

Each VU:

GET website
     |
Check response
     |
Wait 1 second
     |
Repeat


After 20 seconds:

Test stops

Report generated
```

---

# k6 Output Includes

## Requests

```text
Total requests
Requests per second
```

## Performance

```text
Average duration
Median duration
p90
p95
p99
```

## Reliability

```text
Failed requests
Passed checks
Threshold status
```

---

# k6 Mental Model

```text
k6
 |
 |
 +-- Traffic Generator
 |
 +-- Virtual Users (VU)
 |       |
 |       └── Simulated user
 |
 +-- Stages
 |       |
 |       └── Traffic pattern over time
 |
 +-- Default Function
 |       |
 |       └── User actions
 |
 +-- Checks
 |       |
 |       └── Validations
 |
 +-- Thresholds
         |
         └── Pass / Fail rules
```

---

# Final Concept

A complete k6 performance test is built from:

```text
OPTIONS
   |
   ├── How many users?
   ├── How long?
   └── What success criteria?


DEFAULT FUNCTION
   |
   ├── What does one user do?
   ├── What APIs are called?
   └── What pages are loaded?


CHECKS + THRESHOLDS
   |
   ├── Is it fast enough?
   ├── Are requests successful?
   └── Can the system handle the load?
```

The lifecycle script is simply a more realistic version:

```text
Simple k6 example
        +
Real user journey
        +
Frontend + Backend testing
        +
Database interaction
```

This creates a production-like performance test.