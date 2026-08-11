# k6 Performance Testing Guide

This folder contains **k6** performance tests for the MERN Task Manager application.

---

# Test Files

| File | Purpose |
|------|---------|
| `website-performance.js` | Tests frontend page response times (HTML only) |
| `api-performance.js` | Tests backend API endpoints (including database performance) |
| `full-lifecycle.js` | Simulates a complete user journey (Frontend → Login → API → Database) |

---

# Application URLs

| Service | URL |
|---------|-----|
| Frontend | `http://localhost:3000` |
| Backend | `http://localhost:5000` |

---

# Install k6

Verify that k6 is installed:

```cmd
k6 version
```

If k6 is not installed:

```cmd
winget install k6
```

---

# Running the Tests (Windows CMD)

## 1. Frontend Performance Test

Measures HTML page response times.

```cmd
set "BASE_URL=http://localhost:3000"
set "PATHS=/,/auth,/dashboard"
set "VUS=10"
set "DURATION=30s"
set "THRESHOLD_P95=1000"

k6 run .\k6\website-performance.js
```

---

## 2. Backend API Performance Test

Measures API response times including database operations.

```cmd
set "BASE_URL=http://localhost:5000"
set "VUS=20"
set "DURATION=1m"
set "THRESHOLD_P95=800"

set "LOGIN_EMAIL=your@email.com"
set "LOGIN_PASSWORD=your-password"

k6 run .\k6\api-performance.js
```

---

## 3. Full Lifecycle Test (Recommended)

Simulates a real user workflow.

```cmd
set "FRONTEND_URL=http://localhost:3000"
set "BACKEND_URL=http://localhost:5000"

set "LOGIN_EMAIL=your@email.com"
set "LOGIN_PASSWORD=your-password"

k6 run .\k6\full-lifecycle.js
```

---

# Understanding the Results

---

## 1. Thresholds

Example output:

```text
█ THRESHOLDS

checks ............... ✓ 'rate>0.90' rate=100.00%
http_req_duration .... ✓ 'p(95)<1500' p(95)=1.04s
http_req_failed ...... ✓ 'rate<0.05' rate=0.00%
```

| Metric | Meaning | Good Result |
|---------|---------|------------|
| `checks` | Percentage of functional checks that passed | ≥ 99% |
| `http_req_duration p(95)` | 95th percentile response time | Below your threshold |
| `http_req_failed` | Percentage of failed requests | 0% (or very close) |

---

## 2. What is p95?

**p95** means **95th percentile**.

If every response time is sorted from fastest to slowest:

- 95% of requests finished **faster** than the p95 value.
- Only 5% were slower.

Example:

```text
Fetch tasks (DB)
p(95)=1.26s
```

Meaning:

> **95% of users received the response in 1.26 seconds or less.**

The **p95** metric is much more useful than the average because averages can hide slow requests.

---

## 3. HTTP Metrics

Example:

```text
http_req_duration .... avg=358ms  p(95)=1.04s
http_req_failed ...... 0.00%
http_reqs ............ 475 (7.89/s)
```

| Metric | Meaning |
|---------|---------|
| `avg` | Average response time |
| `p(95)` | 95th percentile response time (most important) |
| `http_req_failed` | Percentage of failed requests |
| `http_reqs` | Total requests and requests per second |

---

## 4. Iteration Duration (Full User Journey)

Example:

```text
iteration_duration .... avg=3.2s  p(95)=3.65s
```

This measures the total time required for one complete user journey:

1. Load HTML page
2. Login
3. Fetch tasks from the database
4. Get task details
5. Load dashboard

| Value | Meaning |
|--------|---------|
| `avg = 3.2s` | Average time for one complete workflow |
| `p95 = 3.65s` | 95% of users completed the flow in under 3.65 seconds |

---

## 5. Virtual Users (Load)

Example:

```text
vus ........ 2 → 10
vus_max .... 10
```

| Metric | Meaning |
|---------|---------|
| `vus` | Current concurrent virtual users |
| `vus_max` | Maximum concurrent users during the test |

---

## 6. Network Statistics

Example:

```text
data_received .... 3.2 MB
data_sent ........ 166 kB
```

| Metric | Meaning |
|---------|---------|
| `data_received` | Total data downloaded from the server |
| `data_sent` | Total data uploaded to the server |

---

# Acceptable Results (Local Development)

| Metric | Excellent | Acceptable | Needs Improvement |
|---------|-----------|------------|-------------------|
| Checks passed | 100% | ≥99% | <99% |
| Failed requests | 0% | <1% | >1% |
| Frontend HTML | <50 ms | <200 ms | >500 ms |
| Login API | <500 ms | <1000 ms | >1500 ms |
| Fetch Tasks (Database) | <500 ms | <1200 ms | >1500 ms |
| Full User Flow (p95) | <2.5 s | <4 s | >5 s |

---

# Recommended Testing Workflow

1. Start the backend server.
2. Start the frontend application.
3. Run a small smoke test (5–10 VUs).
4. Ensure:
   - All checks pass.
   - Failed request rate is 0%.
5. Increase load gradually:
   - 20 VUs
   - 30 VUs
   - 50 VUs
6. Monitor:
   - `p(95)` response times
   - Failed request rate
   - Server resource usage (CPU, Memory)
   - Database performance

---

# What Each Test Measures

## Website Performance Test

Measures:

- HTML response time
- Static page performance
- Web server responsiveness

Does **not** include browser rendering or JavaScript execution.

---

## API Performance Test

Measures:

- API response time
- Business logic execution
- Database query performance
- Authentication
- Server processing time

---

## Full Lifecycle Test

Measures the complete end-to-end user experience:

```
User
   │
   ▼
Frontend Page
   │
   ▼
Login API
   │
   ▼
Authentication
   │
   ▼
Database Queries
   │
   ▼
Return Response
   │
   ▼
Dashboard Ready
```

This is the most realistic performance test because it simulates an actual user interacting with the application.

---

# Best Practices

- Use a real user account when testing authenticated routes.
- Run tests against a production-like environment whenever possible.
- Increase load gradually instead of starting with hundreds of users.
- Monitor CPU, memory, and database usage during tests.
- Focus primarily on the **95th percentile (p95)** rather than the average response time.
- Aim for **0% failed requests** under expected load.

---

# Summary

| Test | Measures | Includes Database |
|------|----------|------------------|
| `website-performance.js` | Frontend HTML response time | ❌ No |
| `api-performance.js` | Backend API performance | ✅ Yes |
| `full-lifecycle.js` | Complete user workflow | ✅ Yes |

For most performance evaluations, **`full-lifecycle.js`** provides the best representation of the real user experience.