# 🎟️ TicketBoss – Event Ticketing API

TicketBoss is a lightweight Node.js + Express API for real-time event ticket reservations.  
It guarantees no over-selling through optimistic concurrency control and provides instant accept/deny responses to external partners.

Built as a coding challenge: a single event with **500 seats**, emphasizing correctness under high concurrency.

Badges
- ![Language: JavaScript](https://img.shields.io/badge/language-JavaScript-yellow)
- Node.js v18+

Table of contents
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quickstart](#-quickstart)
  - [Prerequisites](#prerequisites)
  - [Install](#install)
  - [Run the server](#run-the-server)
  - [Concurrency stress test](#concurrency-stress-test)
- [API Reference](#api-reference)
- [All 8 API Examples](#all-8-api-examples)
- [Behavior & Validation Rules](#behavior--validation-rules)
- [Technical decisions](#technical-decisions)
- [Storage & extensibility](#storage--extensibility)
- [Author](#author)

## 🚀 Features

- Real-time seat reservation API
- Guaranteed no over-selling using optimistic concurrency control (versioning)
- Reservation cancellation with automatic seat rollback
- Partner-wise reservation tracking
- Stress-tested for concurrency
- Clean RESTful endpoints with immediate responses

## 🛠️ Tech Stack

- Node.js
- Express.js
- uuid
- In-memory storage (simple, fast, easy to replace)

## 📦 Quickstart

### Prerequisites
- Node.js v18 or higher
- npm (bundled with Node.js)

### Install
```bash
git clone https://github.com/suhassuresha/ticketboss.git
cd ticketboss
npm install
```
This project depends on:
- express
- uuid

(If your repo has a package.json, run `npm install` to get whatever exact dependencies are listed.)

### Run the server
```bash
node app.js
```
Server will be available at:
http://localhost:3000

Keep this terminal running while you run tests.

### 🧪 Concurrency stress test (Important)
A provided stress test verifies there is no over-selling under heavy concurrent load.

Open a second terminal (do not stop the server) and run:
```bash
node concurrent-test.js
```

Expected output:
```
SUCCESS! No over-selling occurred!
```

This confirms:
- Concurrent requests are handled safely
- Available seat count never goes negative
- Optimistic locking works correctly

Actual run (added test result)
------------------------------
The following is an actual run of `concurrent-test.js` from the author's machine. This has been added to the README to document the verified behavior:

```                 
🧪 Starting concurrent reservation test...

📊 Initial State:
   Available Seats: 500
   Version: 0

🚀 Sending 20 concurrent reservation requests (5 seats each)...

📊 Results:
   ✅ Successful: 20
   ⚠️  Conflicts: 0
   ❌ Errors: 0

📊 Final State:
   Available Seats: 400
   Version: 20
   Expected seats: 400

✅ SUCCESS! No over-selling occurred!
```

This output demonstrates a successful stress test: all 20 concurrent reservations (5 seats each) were accepted, no conflicts or errors occurred, and the available seat count matches the expected value.

## 📡 API Reference

Base URL: http://localhost:3000

All examples assume `Content-Type: application/json` where applicable.

### 1) Health check
GET /hello
```bash
curl http://localhost:3000/hello
```
Response:
```json
{
  "message": "Hello from TicketBoss!"
}
```

### 2) Event summary
GET /event
```bash
curl http://localhost:3000/event
```
Response:
```json
{
  "eventId": "node-meetup-2025",
  "name": "Node.js Meet-up",
  "totalSeats": 500,
  "availableSeats": 500,
  "version": 0
}
```

### 3) Reserve seats
POST /reservations
```bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"abc-corp","seats":3}'
```
Success (201 Created):
```json
{
  "reservationId": "a1b2c3d4-...",
  "seats": 3,
  "status": "confirmed"
}
```
Rules:
- `seats` must be between 1 and 10
- Response is immediate: either accepted (201) or rejected (400/409)

### 4) Cancel reservation
DELETE /reservations/:reservationId
```bash
curl -X DELETE http://localhost:3000/reservations/<reservationId>
```
Responses:
- 204 No Content — reservation cancelled, seats returned to pool (event version incremented)
- 404 Not Found — reservation already cancelled or does not exist
```json
{
  "error": "Not Found",
  "message": "Reservation already cancelled"
}
```

### 5) Partner reservations
GET /reservations/:partnerId
```bash
curl http://localhost:3000/reservations/abc-corp
```
Response:
```json
{
  "partnerId": "abc-corp",
  "reservations": [
    {
      "reservationId": "a1b2c3d4-...",
      "partnerId": "abc-corp",
      "seats": 3,
      "status": "confirmed",
      "timestamp": "2025-12-23T14:30:14.413Z"
    }
  ],
  "totalReservedSeats": 3
}
```

## All 8 API Examples

Below are the 8 concrete examples (requests + expected responses). Use these for documentation or automated smoke tests.

1) Health Check
- Request:
```bash
curl http://localhost:3000/hello
```
- Response (200 OK):
```json
{ "message": "Hello from TicketBoss!" }
```

2) Event Summary
- Request:
```bash
curl http://localhost:3000/event
```
- Response (200 OK): event object with totalSeats, availableSeats, version.

3) Reserve Seats (Success)
- Request:
```bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"abc-corp","seats":3}'
```
- Response (201 Created):
```json
{
  "reservationId": "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  "partnerId": "abc-corp",
  "seats": 3,
  "status": "confirmed",
  "timestamp": "2025-12-23T14:30:14.413Z"
}
```

4) Validation Errors
a) Seats = 0 — 400 Bad Request:
```json
{ "error": "Bad Request", "details": ["seats must be greater than 0"] }
```
b) Seats > 10 — 400 Bad Request:
```json
{ "error": "Bad Request", "details": ["seats cannot exceed 10"] }
```

5) Not Enough Seats — 409 Conflict:
```json
{ "error": "Not enough seats left" }
```

6) Cancel Reservation (Success) — 204 No Content (no body)

7) Cancel Already Cancelled — 404 Not Found:
```json
{ "error": "Not Found", "message": "Reservation already cancelled" }
```

8) Partner Reservations — 200 OK with list of reservations and totalReservedSeats.

(See the API examples file or the section above for full example payloads.)

## ⚠️ Behavior & validation rules

- Validation errors return 400 Bad Request with details.
- Not enough seats available -> 409 Conflict.
- Cancellation returns seats to pool and increments event `version`.

## 🧠 Technical decisions

Optimistic Concurrency Control
- The event keeps a `version` field.
- Reservation flow:
  1. Read current `availableSeats` and `version`.
  2. Attempt to update atomically (in-memory CAS or DB conditional update) only if `version` is unchanged.
  3. If the update fails due to a version mismatch, respond with `409 Conflict`.
- This avoids long-lived locks while ensuring correctness under concurrent requests.

Why in-memory storage?
- Simplicity and determinism for the coding challenge and stress tests.
- Fast and easy to reason about for concurrency behavior.
- Replaceable with persistent storage (Postgres, Redis) when needed.

Assumptions
- Single event only (500 seats)
- Stateless API (server can be scaled if backing store is replaced with a shared DB)
- Auth out of scope for the challenge

## Storage & extensibility

- In-memory data structures are used now; to persist and horizontally scale:
  - Use Postgres with a `version` or `updated_at` column and conditional UPDATE.
  - Or use Redis with Lua scripts to perform atomically checked decrements.
- Add migration scripts and connection config when moving to persistent storage.

## Author

Suhas Suresha  
GitHub: [@suhassuresha](https://github.com/suhassuresha)

---