// Import and Create Express
const express = require('express');
const app = express();
const {v4: uuidv4} = require('uuid');

//Tell Express to understand JSON in request bodies
app.use(express.json());

//==== Data Storage ====
// Our event (meetup)
const event = {
  eventId: "node-meetup-2025",
  name: "Node.js Meet-up",
  totalSeats: 500,
  availableSeats: 500,
  version: 0  // This is KEY for preventing race conditions!
};

// Store all reservations (like a phonebook)
// Key = reservationId, Value = reservation object
const reservations = new Map();

console.log('📅 Event initialized:', event.name);
console.log('🎟️  Total seats:', event.totalSeats);

//==== Helper Functions ====

// Check if reservation request is valid
function validateReservationRequest(body){
    const errors = [];

    // Check partenerId exists and its not empty
    if (!body.partnerId || body.partnerId.trim() === ''){
        errors.push('partnerId is required');
    }

    // Check seats is a number
    if (typeof body.seats !== 'number'){
        errors.push('seats must be a number');
    }

    // Check seats is positive
    else if (body.seats <= 0){
        errors.push('seats must be greater than 0');
    }

    // Check seats is not too high
    else if (body.seats > 10){
        errors.push('seats cannot exceed 10')
    }

    // Check seats is a whole number
    else if (!Number.isInteger(body.seats)){
        errors.push('seats must be a whole number');
    }
    return errors;  
}

// Try to reserve seats with version check
// Returns true if successful, false if conflict
function tryReserveSeats(seats, expectedVersion) {
    // Step 1: Check if version matches
    if (event.version !== expectedVersion){
        console.log('❌ Version conflict! Expected:', expectedVersion, 'Actual', event.version);
        return false; // Someone else changed it!
    }

    // Step 2: Check if enough seats available
    if (event.availableSeats < seats) {
        console.log('❌ Not enough seats! Available:', event.availableSeats, 'Requested: ', seats);
        return false;
    }

    // Step 3: Update seats and version Together 
    event.availableSeats -= seats;
    event.version += 1;

    console.log('✅ Reserved', seats, 'seats. New version:', event.version);
    return true; //Success!
}

// Release seats back to available pool
function releaseSeats(seats){
    event.availableSeats += seats; // add seats back
    event.version += 1; // increment version
    console.log('♻️  Released', seats, 'seats. New version:', event.version);
}

//==== Routes ====
//Create our first route
app.get('/hello', (req, res) => {
    res.json({ message: 'Hello from TicketBoss!'})
});

//Get event Information
app.get('/event', (req, res) => {
    res.json({
        eventId: event.eventId,
        name: event.name,
        totalSeats: event.totalSeats,
        availableSeats: event.availableSeats,
        version: event.version
    });
});

// Create a new reservation
app.post('/reservations', (req, res) => {
    console.log('📨 Reservation request:', req.body);

    // Step 1: Validate the request
    const errors = validateReservationRequest(req.body);
    if (errors.length > 0){
        return res.status(400).json({
            error: 'Bad Request',
            details: errors
        });
    }

    // Step 2 : Get data from request
    const { partnerId, seats } = req.body;

    //Step 3: Remember current state (optimistic locking strats here)
    const currentVersion = event.version;
    const currentAvailable = event.availableSeats;

    console.log('📊 Current state: version =', currentVersion, ', available =', currentAvailable );

    //Step 4: Quick check 
    if (currentAvailable < seats) {
        return res.status(409).json({
            error: 'Not enough seats left',
            availableSeats: currentAvailable,
            requestedSeats: seats
        });
    }

    // Step 5: Try to reserve with version check
    const success = tryReserveSeats(seats, currentVersion);

    if (!success){
        // Version changed or not enough seats
        return res.status(409).json({
            error: 'Not enough seats left',
            message: 'Conflict detected - please retry'
        });
    }

    // Step 6: Success! Create reservation record
    const reservationId = uuidv4(); // Generate unique id
    const reservation = {
        reservationId: reservationId,
        partnerId: partnerId,
        seats: seats,
        status: 'confirmed',
        timestamp: new Date().toISOString()
    };

    // Step 7: Save reservations
    reservations.set(reservationId, reservation);
    console.log('✅ Reservation created:', reservationId)

    // Step 8: Send success response
    return res.status(201).json({
        reservationId: reservation.reservationId,
        seats: reservation.seats,
        status: reservation.status
    });
})

// Cancel a reservation
app.delete('/reservations/:reservationId', (req, res) => {
    // Get ID from URL
    const { reservationId } = req.params;
    console.log('🗑️  Cancel request for:', reservationId);

    //Step 1: Find the reservation
    const reservation = reservations.get(reservationId);

    // Step 2: Check if exists
    if (!reservation){
        return res.status(404).json({
            error: 'Not Found',
            message: 'Reservation not found'
        });
    }

    // Step 3: Check if already cancelled
    if(reservation.status === 'cancelled'){
        return res.status(404).json({
            error: 'Not Found',
            message: 'Reservation already cancelled'
        });
    }

    // Step 4: Release seats back
    releaseSeats(reservation.seats);

    // Step 5: Mark as cancelled (keep for audit)
    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date().toISOString();

    console.log('✅ Reservation cancelled');

    // Step 6: Return success
    return res.status(204).send();
});

// Get all reservations for a aprtner
app.get('/reservations/:partnerId', (req, res) => {
    const { partnerId } = req.params;

    console.log('🔍 Getting reservations for:', partnerId);

    // Step 1: Convert Map to Array
    const allResrvations = Array.from(reservations.values());

    //Step 2: Filter for this partner (only confirmed)
    const partnerReservations = allResrvations.filter(r => 
        r.partnerId === partnerId && r.status === 'confirmed'
    );

    //Step 3: Calculate total seats
    const totalSeats = partnerReservations.reduce((sum, r) => sum + r.seats, 0);

    // Step 4: Return the result
    return res.json({
        partnerId: partnerId,
        reservations: partnerReservations,
        totalSeats: totalSeats
    });
});

//Start the server
app.listen(3000, () => {
    console.log('Server is running on http://localhost:3000');
});