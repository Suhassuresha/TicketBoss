
Markdown
# 🎟️ TicketBoss – Event Ticketing API

TicketBoss is a lightweight **Node.js + Express** API for real-time event ticket reservations.  
It guarantees **no over-selling** through **optimistic concurrency control** and provides **instant accept/deny responses** to external partners.

Built for a coding challenge: a single event with **500 seats**, with a strong focus on correctness under high concurrency.

## 🚀 Features

- Real-time seat reservation
- Guaranteed no over-selling
- Optimistic concurrency control using versioning
- Reservation cancellation with automatic seat rollback
- Partner-wise reservation tracking
- Thoroughly stress-tested for concurrency
- Clean, RESTful API design

## 🛠️ Tech Stack

- Node.js
- Express.js
- UUID
- In-memory storage

## 📦 Setup Instructions

### Prerequisites
- Node.js v18 or higher
- npm (included with Node.js)

### Installation

```bash
git clone https://github.com/suhassuresha/ticketboss.git
cd ticketboss
npm install
This installs:

express
uuid
Run the Server

Bash
node app.js
Server will be available at:
http://localhost:3000

Keep this terminal running.

🧪 Concurrency Testing (Important)

The project includes a stress test script to verify no over-selling occurs under heavy concurrent load.

Open a second terminal (do not stop the server) and run:

Bash
node concurrent-test.js
Expected output:

text
SUCCESS! No over-selling occurred!
This confirms:

Concurrent requests are handled safely
Available seat count never goes negative
Optimistic locking works correctly
📡 API Documentation & Examples

1. Health Check

GET /hello

Bash
curl http://localhost:3000/hello
JSON
{
  "message": "Hello from TicketBoss!"
}
2. Event Summary

GET /event

Bash
curl http://localhost:3000/event
JSON
{
  "eventId": "node-meetup-2025",
  "name": "Node.js Meet-up",
  "totalSeats": 500,
  "availableSeats": 500,
  "version": 0
}
3. Reserve Seats (Success)

POST /reservations

Bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"abc-corp","seats":3}'
201 Created

JSON
{
  "reservationId": "a1b2c3d4-...", 
  "seats": 3,
  "status": "confirmed"
}
Rules:

seats must be between 1 and 10
Response is immediate (accepted or rejected)
4. Validation Errors

Seats = 0

Bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"abc-corp","seats":0}'
400 Bad Request

JSON
{
  "error": "Bad Request",
  "details": ["seats must be greater than 0"]
}
Seats > 10

Bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"abc-corp","seats":15}'
400 Bad Request

JSON
{
  "error": "Bad Request",
  "details": ["seats cannot exceed 10"]
}
5. Not Enough Seats

(When fewer seats are available than requested)

Bash
curl -X POST http://localhost:3000/reservations \
  -H "Content-Type: application/json" \
  -d '{"partnerId":"late-partner","seats":6}'
409 Conflict

JSON
{
  "error": "Not enough seats left"
}
6. Cancel Reservation

DELETE /reservations/:reservationId

Bash
curl -X DELETE http://localhost:3000/reservations/<reservationId>
204 No Content
Seats are returned to the pool and event version is incremented.

7. Cancel Already Cancelled

Bash
curl -X DELETE http://localhost:3000/reservations/<reservationId>
404 Not Found

JSON
{
  "error": "Not Found",
  "message": "Reservation already cancelled"
}
8. Partner Reservations

GET /reservations/:partnerId

Bash
curl http://localhost:3000/reservations/abc-corp
JSON
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
🧠 Technical Decisions

Optimistic Concurrency Control

A version field is maintained on the event
Each reservation reads the current version before attempting an update
If the version has changed since reading, the request fails with 409 Conflict
This prevents race conditions and ensures no over-selling
Storage

In-memory data structures for simplicity and speed
Easily replaceable with persistent storage (e.g., PostgreSQL, Redis)
Assumptions

Single event only
Stateless API
Authentication/authorization out of scope
👤 Author

Suhas Suresha
GitHub: https://github.com/suhassuresha