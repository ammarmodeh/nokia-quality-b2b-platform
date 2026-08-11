# Understanding k6 Results

After running a k6 test, the output contains several important metrics.

Example:

```text
█ THRESHOLDS

checks.....................: 100.00% ✓ 5000 ✗ 0

http_req_duration..........: avg=358ms p(95)=1.04s

http_req_failed............: 0.00%

http_reqs..................: 475 (7.89/s)

iterations.................: 100

vus........................: 10

vus_max....................: 10
```

---

# Thresholds

Thresholds define the acceptable performance limits.

Example:

```javascript
export const options = {
    thresholds: {
        http_req_duration: [
            "p(95)<1000"
        ],

        http_req_failed: [
            "rate<0.01"
        ]
    }
}
```

Meaning:

```
95% of requests must complete under 1 second

AND

Failed requests must be less than 1%
```

---

# Recommended Thresholds

General web application targets:

| Metric | Recommended Target |
|---|---|
| Successful checks | ≥99% |
| Failed requests | <1% |
| API p95 | <1 second |
| Frontend response | <500 ms |
| Database operations | <500 ms |

---

# Understanding Percentiles

Percentiles show how many users experience a certain response time.

They are more useful than averages.

---

## Average (avg)

Example:

```
Average response = 300ms
```

Problem:

Averages can hide slow requests.

Example:

```
Requests:

100ms
120ms
150ms
200ms
5000ms
```

Average:

```
1114ms
```

The average does not show the real user experience.

---

# p50 (Median)

p50 means:

```
50% of requests are faster
50% are slower
```

Example:

```
p50 = 200ms
```

Half of users receive responses below 200ms.

---

# p90

p90 means:

```
90% of requests are faster
10% are slower
```

Useful for understanding slower users.

---

# p95

p95 is one of the most important performance indicators.

Example:

```
p95 = 800ms
```

Meaning:

```
95% of users received responses within 800ms
```

Only:

```
5% of users experienced slower responses
```

Most companies use p95 for performance targets.

---

# p99

p99 represents the worst 1% of users.

Example:

```
p99 = 5 seconds
```

Meaning:

99% of users were faster than 5 seconds.

Large differences between p95 and p99 usually indicate:

- Occasional slow database queries
- External API delays
- Resource contention
- Garbage collection pauses

---

# Example Percentile Analysis

Result:

```
p50 = 150ms

p90 = 400ms

p95 = 700ms

p99 = 4s
```

Interpretation:

| Metric | Meaning |
|---|---|
| p50 | Most users are very fast |
| p90 | Normal user experience |
| p95 | Acceptable |
| p99 | Some users experience delays |

---

# HTTP Request Metrics

Example:

```text
http_req_duration .... avg=358ms p(95)=1.04s

http_req_failed ...... 0%

http_reqs ............ 5000 (80/s)
```

---

## http_req_duration

Measures:

Total HTTP request duration.

Includes:

- Connection time
- Server processing
- Response transfer

Example:

```
API request:

Client
 |
 |
Backend
 |
 |
Database
 |
 |
Response

Total:
800ms
```

---

## http_req_failed

Percentage of failed HTTP requests.

Example:

```
http_req_failed = 0.2%
```

Means:

2 requests failed per 1000 requests.

---

Recommended:

| Error Rate | Status |
|---|---|
| 0% | Excellent |
| <0.5% | Good |
| <1% | Acceptable |
| 1-5% | Needs investigation |
| >5% | Critical |

---

## http_reqs

Total HTTP requests.

Example:

```
http_reqs = 10000

rate = 150/s
```

Meaning:

During the test:

```
10,000 requests were executed

Average:
150 requests every second
```

---

# Iteration Duration

An iteration represents one complete user workflow.

Example:

```
iteration_duration = 3.2s
```

A user flow:

```
Open website

↓

Login

↓

Load dashboard

↓

Fetch tasks

↓

Display data
```

Total:

```
3.2 seconds
```

---

# Virtual Users Metrics

Example:

```
vus ............ 100

vus_max ........ 100
```

Meaning:

The test simulated 100 concurrent users.

---

# Network Metrics

Example:

```
data_received .... 500 MB

data_sent ........ 50 MB
```

---

## data_received

Amount of data downloaded.

Large values may indicate:

- Large API responses
- Unoptimized images
- Missing compression

---

## data_sent

Amount of data uploaded.

Large values may indicate:

- Large request payloads
- File uploads
- Inefficient APIs

---

# Response Time Benchmarks

These values are general industry guidelines.

Actual acceptable values depend on:

- Application type
- User expectations
- Business requirements
- Infrastructure

---

# API Response Time

| Duration | Rating |
|---|---|
| <100 ms | Excellent |
| 100-300 ms | Very Good |
| 300-800 ms | Good |
| 800-1500 ms | Acceptable |
| 1.5-3 seconds | Slow |
| >3 seconds | Poor |

---

# Frontend HTML Response

| Duration | Rating |
|---|---|
| <100 ms | Excellent |
| 100-300 ms | Very Good |
| 300-700 ms | Good |
| 700ms-1.5s | Acceptable |
| >1.5s | Slow |

---

# Login Performance

Authentication usually involves:

- Password verification
- Database lookup
- Token generation
- Session creation

Recommended:

| Duration | Rating |
|---|---|
| <300ms | Excellent |
| 300-700ms | Good |
| 700ms-1.5s | Acceptable |
| >2s | Slow |

---

# Database Query Performance

General targets:

| Query Duration | Rating |
|---|---|
| <50ms | Excellent |
| 50-200ms | Good |
| 200-500ms | Acceptable |
| 500ms-1s | Needs optimization |
| >1s | Problem |

---

# Real User Experience Targets

Users generally expect:

| Action | Good Target |
|---|---|
| Page opening | <2 seconds |
| Search | <1 second |
| Login | <1 second |
| Dashboard loading | <2 seconds |
| Simple API call | <500ms |
| Complex report | <5 seconds |

---

# Important Note

There is no universal "good response time".

Example:

A social media feed:

```
p95 <2 seconds
```

may be acceptable.

A payment transaction:

```
p95 <1 second
```

is preferred.

An AI generation request:

```
10-30 seconds
```

may be acceptable.

Performance targets depend on the business function.