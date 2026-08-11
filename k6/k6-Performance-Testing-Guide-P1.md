# k6 Performance Testing Guide

A reusable guide for testing the performance of modern web applications and APIs using **k6**.

This document can be applied to:

- React applications
- Next.js applications
- Vue applications
- Angular applications
- MERN applications
- REST APIs
- GraphQL APIs
- Backend services
- Microservices

---

# Table of Contents

1. [Introduction](#introduction)
2. [Performance Testing Concepts](#performance-testing-concepts)
3. [Types of Performance Testing](#types-of-performance-testing)
4. [k6 Installation](#k6-installation)
5. [Running k6 Tests](#running-k6-tests)
6. [Understanding k6 Results](#understanding-k6-results)
7. [Performance Metrics](#performance-metrics)
8. [Response Time Benchmarks](#response-time-benchmarks)
9. [Concurrent User Guidelines](#concurrent-user-guidelines)
10. [Performance Targets by Application Type](#performance-targets-by-application-type)
11. [Identifying Bottlenecks](#identifying-bottlenecks)
12. [Optimization Recommendations](#optimization-recommendations)

---

# Introduction

Performance testing measures how an application behaves under different traffic conditions.

It helps answer important questions:

- How many users can the system handle?
- How fast are pages loading?
- How quickly do APIs respond?
- Does performance degrade when users increase?
- Where is the bottleneck?
- Is the system ready for production?

A website may work perfectly with one user but fail when hundreds or thousands of users access it simultaneously.

Performance testing helps discover these limitations before real customers experience problems.

---

# Performance Testing Concepts

## Response Time

Response time is the time between sending a request and receiving the complete response.

Example:

```
User clicks "Load Tasks"

        |
        |
        v

Frontend sends API request

        |
        |
        v

Backend processes request

        |
        |
        v

Database returns data

        |
        |
        v

Response received by user
```

The total duration includes:

- Network latency
- Server processing time
- Database execution time
- External API calls
- Response transfer time

---

# Throughput

Throughput measures how much work the system can process.

Usually measured as:

- Requests per second (RPS)
- Transactions per second (TPS)

Example:

```
http_reqs ........ 10000
rate ............ 120/s
```

Meaning:

The application processed:

```
120 requests every second
```

A system with high throughput but slow response time is still considered poorly performing.

---

# Concurrent Users

Concurrent users are users accessing the application at the same time.

Example:

```
10 users
100 users
1000 users
```

Important:

Concurrent users are not the same as total registered users.

Example:

A website may have:

```
1,000,000 registered users

but only

500 concurrent users
```

during peak traffic.

---

# Virtual Users (VUs)

In k6, users are simulated using Virtual Users.

Example:

```
vus ........ 100
vus_max .... 100
```

Meaning:

The test simulated 100 simultaneous users.

Each virtual user executes the defined workflow.

Example:

```
Open website
    |
Login
    |
Load dashboard
    |
Fetch data
    |
Repeat
```

---

# Types of Performance Testing

## 1. Smoke Testing

Purpose:

Verify that the application works with minimal load.

Example:

```
Users:
5

Duration:
1 minute
```

Used for:

- New deployments
- CI/CD pipelines
- Quick validation

Expected:

- No failures
- Stable response times

---

# 2. Load Testing

Purpose:

Test normal expected production traffic.

Example:

```
Users:
100 concurrent users

Duration:
30 minutes
```

Questions answered:

- Can the system handle normal traffic?
- Are response times acceptable?
- Are resources sufficient?

---

# 3. Stress Testing

Purpose:

Find the maximum capacity.

Example:

```
100 users
200 users
500 users
1000 users
```

Until:

- Response time becomes unacceptable
- Errors increase
- Resources are exhausted

---

# 4. Spike Testing

Purpose:

Test sudden traffic increases.

Example:

Normal:

```
50 users
```

Suddenly:

```
1000 users
```

Used for:

- Marketing campaigns
- Product launches
- Breaking news websites

---

# 5. Soak Testing

Purpose:

Check long-term stability.

Example:

```
100 users

for 8 hours
```

Detects:

- Memory leaks
- Database connection leaks
- Resource exhaustion

---

# 6. Capacity Testing

Purpose:

Determine maximum supported users.

Example:

Testing until:

```
500 users = OK

1000 users = OK

1500 users = Failed
```

The capacity is around:

```
1000-1500 concurrent users
```

---

# Example k6 Project Structure

```
project
│
├── k6
│   |
│   ├── website-performance.js
│   ├── api-performance.js
│   └── full-lifecycle.js
│
└── README.md
```

---

# Example Test Files

| File | Purpose |
|---|---|
| website-performance.js | Tests frontend page response |
| api-performance.js | Tests backend APIs |
| full-lifecycle.js | Tests complete user workflow |

---

# k6 Installation

Check installation:

```cmd
k6 version
```

Install on Windows:

```cmd
winget install k6
```

Verify:

```cmd
k6 version
```

Example output:

```
k6 v1.x.x
```

---

# Running k6 Tests

## Frontend Test

Example:

```cmd
set "BASE_URL=http://localhost:3000"

set "VUS=10"

set "DURATION=30s"

k6 run .\k6\website-performance.js
```

Measures:

- HTML response time
- Web server response
- Static content delivery

---

## API Test

Example:

```cmd
set "BASE_URL=http://localhost:5000"

set "VUS=20"

set "DURATION=1m"

k6 run .\k6\api-performance.js
```

Measures:

- API response
- Backend processing
- Database operations

---

## Full Lifecycle Test

Example:

```cmd
set "FRONTEND_URL=http://localhost:3000"

set "BACKEND_URL=http://localhost:5000"

k6 run .\k6\full-lifecycle.js
```

Simulates:

```
User opens website

↓

Login

↓

Authentication

↓

API calls

↓

Database queries

↓

Dashboard loaded
```

---

**End of Part 1/4**

I will continue with **Part 2/4: k6 Results, p50/p90/p95/p99, thresholds, metrics, and response-time benchmarks.**