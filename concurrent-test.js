const BASE_URL = 'http://localhost:3000';

async function makeReservation(partnerId, seats) {
    try {
        const response = await fetch(`${BASE_URL}/reservations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ partnerId, seats })
        });
        
        const data = await response.json();
        return { status: response.status, data };
    } catch (error) {
        return { error: error.message };
    }
}

async function runConcurrentTest() {
    console.log('🧪 Starting concurrent reservation test...\n');
    
    // Get initial State
    const initialState = await fetch(`${BASE_URL}/event`).then(res => res.json());
    console.log('📊 Initial State:');
    console.log('   Available Seats:', initialState.availableSeats);
    console.log('   Version:', initialState.version);
    console.log('');
    
    // Create 20 simultaneous requests for 5 seats each
    console.log('🚀 Sending 20 concurrent reservation requests (5 seats each)...\n');
    
    const promises = [];
    for (let i = 0; i < 20; i++) {
        promises.push(makeReservation(`partner-${i}`, 5));
    }
    
    // Wait for all to complete
    const results = await Promise.all(promises);
    
    // Count successes and failures
    const successful = results.filter(r => r.status === 201);
    const conflicts = results.filter(r => r.status === 409);
    const errors = results.filter(r => r.error);
    
    console.log('📊 Results:');
    console.log('   ✅ Successful:', successful.length);
    console.log('   ⚠️  Conflicts:', conflicts.length);
    console.log('   ❌ Errors:', errors.length);
    console.log('');
    
    // Final State
    const finalState = await fetch(`${BASE_URL}/event`).then(res => res.json());
    console.log('📊 Final State:');
    console.log('   Available Seats:', finalState.availableSeats);
    console.log('   Version:', finalState.version);
    console.log('   Expected seats:', initialState.availableSeats - (successful.length * 5));
    console.log('');
    
    // Verify correctness
    const expectedSeats = initialState.availableSeats - (successful.length * 5);
    if (finalState.availableSeats === expectedSeats) {
        console.log('✅ SUCCESS! No over-selling occurred!');
    } else {
        console.log('❌ ERROR! Seat count mismatch!');
    }
}

runConcurrentTest();