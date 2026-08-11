# Concurrent Users and Capacity Planning

Response time cannot be evaluated without considering the number of concurrent users.

A response time that is excellent for 10 users may become unacceptable for 1000 users.

Example:

```
10 users:

API p95 = 300ms


500 users:

API p95 = 3 seconds
```

The application may be healthy at low traffic but unable to scale.

---

# Concurrent User Performance Guidelines

These are general guidelines for web applications.

Actual results depend on:

- Application complexity
- Database design
- Infrastructure
- Cloud resources
- Network latency
- Third-party services

---

## Small Applications

Examples:

- Internal tools
- Small dashboards
- Company websites

Expected users:

```
10 - 100 concurrent users
```

Recommended:

| Metric | Target |
|---|---|
| API p95 | <1 second |
| Page response | <1 second |
| Error rate | <1% |
| CPU usage | <70% |

---

# Medium Applications

Examples:

- SaaS applications
- Customer portals
- Business systems

Expected users:

```
100 - 1000 concurrent users
```

Recommended:

| Metric | Target |
|---|---|
| API p95 | <1.5 seconds |
| Page response | <2 seconds |
| Error rate | <1% |
| CPU usage | <80% |

---

# Large Applications

Examples:

- E-commerce platforms
- Social networks
- Public applications

Expected users:

```
1000+ concurrent users
```

Recommended:

| Metric | Target |
|---|---|
| API p95 | <2 seconds |
| Page response | <3 seconds |
| Error rate | <1% |
| Availability | 99.9%+ |

---

# Concurrent User Reference Table

| Concurrent Users | Typical p95 Target |
|---|---|
| 10 | <500ms |
| 50 | <800ms |
| 100 | <1 second |
| 250 | <1.5 seconds |
| 500 | <2 seconds |
| 1000 | <3 seconds |
| 5000+ | Depends on architecture |

---

# Application Type Performance Expectations

Different applications have different requirements.

---

## Static Websites

Examples:

- Landing pages
- Marketing websites
- Documentation websites

Expected:

```
Very fast response
```

Targets:

| Metric | Target |
|---|---|
| HTML response | <200ms |
| Page load | <2 seconds |

---

## CRUD Applications

Examples:

- Task management
- Employee systems
- Admin panels

Targets:

| Operation | Target |
|---|---|
| List records | <1 second |
| Create record | <1 second |
| Update record | <1 second |
| Delete record | <1 second |

---

## E-commerce Applications

Examples:

- Online stores
- Marketplaces

Important flows:

- Search
- Product page
- Cart
- Checkout
- Payment

Targets:

| Operation | Target |
|---|---|
| Product search | <1 second |
| Product page | <2 seconds |
| Checkout | <2 seconds |

---

## Social Networks

Examples:

- Feeds
- Messaging
- Profiles

Important:

- Feed generation
- Media loading
- Notifications

Targets:

| Operation | Target |
|---|---|
| Feed loading | <2 seconds |
| Profile loading | <1.5 seconds |
| Messaging | <500ms |

---

## Analytics Dashboards

Examples:

- Reports
- Charts
- Data visualization

Dashboards often process large amounts of data.

Acceptable:

```
2-5 seconds
```

depending on complexity.

Optimization:

- Cache reports
- Precalculate data
- Use aggregation tables

---

# Load Test Scenarios

A good performance test should simulate realistic traffic.

---

# Scenario 1: Normal Traffic

Example:

```
Users:
100

Duration:
30 minutes
```

Purpose:

Verify normal operation.

Expected:

- Stable response times
- No errors
- Normal resource usage

---

# Scenario 2: Peak Traffic

Example:

```
Users:
500

Duration:
1 hour
```

Purpose:

Simulate busy periods.

Examples:

- Sales campaigns
- Working hours
- Product launches

---

# Scenario 3: Stress Test

Example:

```
Start:

100 users


Increase:

200
500
1000
2000
```

Purpose:

Find system limits.

---

# Scenario 4: Spike Test

Example:

Normal:

```
50 users
```

Suddenly:

```
2000 users
```

Purpose:

Check:

- Auto scaling
- Queue handling
- Recovery capability

---

# Resource Monitoring During Tests

Performance testing should not only measure response time.

Monitor the entire system.

---

# CPU Usage

CPU indicates processing pressure.

General guideline:

| CPU Usage | Status |
|---|---|
| <50% | Excellent |
| 50-70% | Healthy |
| 70-85% | Monitor |
| >85% | Risk |
| 100% | Bottleneck |

---

# Memory Usage

High memory usage may indicate:

- Memory leaks
- Large objects
- Poor caching
- Too many processes

Guideline:

| Memory | Status |
|---|---|
| <70% | Healthy |
| 70-85% | Monitor |
| >85% | Risk |

---

# Disk Usage

Monitor:

- Disk space
- Disk I/O
- Log files

Problems:

- Slow writes
- Database delays
- Application freezing

---

# Database Monitoring

Databases are often the main bottleneck.

Monitor:

- Query duration
- Connection count
- CPU usage
- Locks
- Slow queries

---

# Database Problems Commonly Found

## Missing Indexes

Example:

Bad:

```sql
SELECT *
FROM users
WHERE email='user@test.com';
```

Without index:

```
Database scans every record
```

With index:

```
Database directly finds the record
```

---

## N+1 Query Problem

Example:

Application:

```
Get 100 users

Then:

Get profile for each user
```

Result:

```
101 database queries
```

Better:

```
One optimized query
```

---

## Large Payloads

Example:

Bad API:

```
GET /users
```

Returns:

```
50 MB JSON
```

Better:

```
Pagination:

GET /users?page=1&limit=20
```

---

# Network Performance

Slow performance may be caused by:

- High latency
- Large files
- Missing compression
- Poor CDN configuration

Optimize:

- Enable gzip/brotli compression
- Use CDN
- Optimize images
- Reduce API payload size

---

# External API Dependencies

Applications often depend on:

- Payment gateways
- Maps
- Email services
- Authentication providers

A slow external service increases your response time.

Example:

```
Your API:

500ms


External API:

3 seconds


Total:

3.5 seconds
```

Solutions:

- Async processing
- Caching
- Queue systems
- Timeout handling

---

# Identifying the Bottleneck

When response time increases, check:

```
Is CPU high?

        |
        v

Is Memory high?

        |
        v

Are Database queries slow?

        |
        v

Are External APIs slow?

        |
        v

Is Network saturated?
```

---

# Performance Investigation Example

Problem:

```
API response:

5 seconds
```

Investigation:

```
Network:
50ms


Backend:
200ms


Database:
4.5 seconds
```

Conclusion:

Database optimization required.

```
Not a frontend problem.
Not a network problem.
Database is the bottleneck.
```
