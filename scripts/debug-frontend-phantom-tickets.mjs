#!/usr/bin/env node

/**
 * Debug Frontend Phantom Tickets
 * 
 * This script tests both API endpoints and Convex queries to identify
 * where the "You have a ticket!" message is coming from
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test with the organizer from the screenshot
const TEST_CONFIG = {
  organizerUserId: 'user_2x3676Wr2uaeDul4flLUGvsOAOV',
  // Let's use a known event for testing
  testEventId: 'jh716mjrw1nd9cven9w80k760s7j4a9j'
};

async function debugFrontendPhantomTickets() {
  console.log('🔍 DEBUGGING FRONTEND PHANTOM TICKETS');
  console.log('=====================================');
  console.log(`Test User: ${TEST_CONFIG.organizerUserId}`);
  console.log(`Test Event: ${TEST_CONFIG.testEventId}`);
  console.log('');

  // Test 1: Direct Convex Query - getUserTicketForEvent (original)
  console.log('📊 Test 1: Direct Convex - getUserTicketForEvent (Original)');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEvent',
        args: { 
          userId: TEST_CONFIG.organizerUserId,
          eventId: TEST_CONFIG.testEventId
        }
      })
    });
    
    const result = await response.json();
    const ticket = result.status === 'success' ? result.value : result;
    
    console.log(`Response Status: ${response.status}`);
    console.log(`Ticket Found: ${ticket ? 'YES' : 'NO'}`);
    
    if (ticket) {
      console.log('❌ PHANTOM TICKET DETECTED in original function!');
      console.log(`   - Ticket ID: ${ticket._id}`);
      console.log(`   - Paystack Ref: ${ticket.paystackReference || 'MISSING'}`);
      console.log(`   - Status: ${ticket.status}`);
      console.log(`   - Amount: ${ticket.amount}`);
    } else {
      console.log('✅ No phantom ticket found in original function');
    }
  } catch (error) {
    console.error('❌ Error testing original function:', error.message);
  }

  // Test 2: Direct Convex Query - getUserTicketForEventOptimized
  console.log('\n📊 Test 2: Direct Convex - getUserTicketForEventOptimized (Fixed)');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEventOptimized',
        args: { 
          userId: TEST_CONFIG.organizerUserId,
          eventId: TEST_CONFIG.testEventId
        }
      })
    });
    
    const result = await response.json();
    const ticket = result.status === 'success' ? result.value : result;
    
    console.log(`Response Status: ${response.status}`);
    console.log(`Ticket Found: ${ticket ? 'YES' : 'NO'}`);
    
    if (ticket) {
      console.log('❌ PHANTOM TICKET DETECTED in optimized function!');
      console.log(`   - Ticket ID: ${ticket._id}`);
      console.log(`   - Paystack Ref: ${ticket.paystackReference || 'MISSING'}`);
      console.log(`   - Status: ${ticket.status}`);
      console.log(`   - Amount: ${ticket.amount}`);
    } else {
      console.log('✅ No phantom ticket found in optimized function');
    }
  } catch (error) {
    console.error('❌ Error testing optimized function:', error.message);
  }

  // Test 3: API Endpoint - User Tickets
  console.log('\n📊 Test 3: API Endpoint - User Tickets');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${BASE_URL}/api/users/${TEST_CONFIG.organizerUserId}/tickets?eventId=${TEST_CONFIG.testEventId}`);
    const result = await response.json();
    
    console.log(`Response Status: ${response.status}`);
    console.log(`Cache Headers: ${response.headers.get('x-data-source') || 'none'}`);
    console.log(`Response Time: ${response.headers.get('x-response-time') || 'unknown'}`);
    
    if (result.tickets && Array.isArray(result.tickets) && result.tickets.length > 0) {
      console.log('❌ PHANTOM TICKETS DETECTED in API endpoint!');
      result.tickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. Ticket ID: ${ticket._id || 'Unknown'}`);
        console.log(`      - Paystack Ref: ${ticket.paystackReference || 'MISSING'}`);
        console.log(`      - Status: ${ticket.status}`);
        console.log(`      - Amount: ${ticket.amount}`);
      });
    } else {
      console.log('✅ No phantom tickets found in API endpoint');
      console.log(`Returned: ${JSON.stringify(result, null, 2)}`);
    }
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error.message);
  }

  // Test 4: Check for any tickets in the database for this user
  console.log('\n📊 Test 4: All User Tickets Check');
  console.log('-'.repeat(60));
  
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTickets',
        args: { userId: TEST_CONFIG.organizerUserId }
      })
    });
    
    const result = await response.json();
    const tickets = result.status === 'success' ? result.value : result;
    
    console.log(`Response Status: ${response.status}`);
    console.log(`Total Tickets Found: ${tickets?.length || 0}`);
    
    if (tickets && tickets.length > 0) {
      console.log('📋 All tickets for this user:');
      tickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. Event: ${ticket.eventId}`);
        console.log(`      - Ticket ID: ${ticket._id}`);
        console.log(`      - Paystack Ref: ${ticket.paystackReference || 'MISSING'}`);
        console.log(`      - Status: ${ticket.status}`);
        console.log(`      - Amount: ${ticket.amount}`);
        console.log(`      - Is Test?: ${isTestTicket(ticket)}`);
        console.log('');
      });
    } else {
      console.log('✅ No tickets found for this user');
    }
  } catch (error) {
    console.error('❌ Error testing all user tickets:', error.message);
  }

  // Test 5: Check the actual event that's showing the phantom ticket
  console.log('\n📊 Test 5: Find RAVE Event and Check Tickets');
  console.log('-'.repeat(60));
  
  try {
    // Get all events by the organizer
    const eventsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getSellerEvents',
        args: { userId: TEST_CONFIG.organizerUserId }
      })
    });
    
    const eventsResult = await eventsResponse.json();
    const events = eventsResult.status === 'success' ? eventsResult.value : eventsResult;
    
    if (events && events.length > 0) {
      console.log(`📋 Found ${events.length} events by organizer`);
      
      // Find the RAVE event or any recent event
      const raveEvent = events.find(event => 
        event.name === 'RAVE' ||
        event.name.includes('RAVE') ||
        event.location?.includes('State Housing Estate')
      );
      
      if (raveEvent) {
        console.log(`✅ Found RAVE event: ${raveEvent._id}`);
        console.log(`   Name: ${raveEvent.name}`);
        console.log(`   Published: ${raveEvent.isPublished ? 'Yes' : 'No'}`);
        
        // Test the specific event
        await testEventSpecifically(raveEvent._id, TEST_CONFIG.organizerUserId);
      } else {
        console.log('❌ RAVE event not found, testing most recent event');
        if (events.length > 0) {
          const mostRecent = events[0];
          console.log(`Testing event: ${mostRecent.name} (${mostRecent._id})`);
          await testEventSpecifically(mostRecent._id, TEST_CONFIG.organizerUserId);
        }
      }
    } else {
      console.log('❌ No events found for organizer');
    }
  } catch (error) {
    console.error('❌ Error finding RAVE event:', error.message);
  }

  console.log('\n🎯 SUMMARY & RECOMMENDATIONS');
  console.log('=============================');
  console.log('1. Check if original getUserTicketForEvent function still has filtering issues');
  console.log('2. Verify which function the frontend is actually calling');
  console.log('3. Check for caching issues in browser or API layer');
  console.log('4. Test with a completely new event to see if issue persists');
  console.log('5. Clear browser cache and test again');
}

async function testEventSpecifically(eventId, userId) {
  console.log(`\n   Testing Event ${eventId}:`);
  
  try {
    // Test both functions
    const [originalResponse, optimizedResponse] = await Promise.all([
      fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'tickets:getUserTicketForEvent',
          args: { userId, eventId }
        })
      }),
      fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'tickets:getUserTicketForEventOptimized',
          args: { userId, eventId }
        })
      })
    ]);
    
    const originalResult = await originalResponse.json();
    const optimizedResult = await optimizedResponse.json();
    
    const originalTicket = originalResult.status === 'success' ? originalResult.value : originalResult;
    const optimizedTicket = optimizedResult.status === 'success' ? optimizedResult.value : optimizedResult;
    
    console.log(`   - Original function: ${originalTicket ? 'TICKET FOUND' : 'No ticket'}`);
    console.log(`   - Optimized function: ${optimizedTicket ? 'TICKET FOUND' : 'No ticket'}`);
    
    if (originalTicket && !optimizedTicket) {
      console.log('   ⚠️  ISSUE: Original function returning ticket but optimized is not');
      console.log(`      Original ticket ref: ${originalTicket.paystackReference || 'MISSING'}`);
    } else if (!originalTicket && !optimizedTicket) {
      console.log('   ✅ Both functions correctly return no ticket');
    }
  } catch (error) {
    console.error(`   ❌ Error testing event ${eventId}:`, error.message);
  }
}

function isTestTicket(ticket) {
  if (!ticket.paystackReference) return true;
  
  const testPatterns = ['test', 'test_ref_', 'test_protection_check'];
  return testPatterns.some(pattern => 
    ticket.paystackReference === pattern || 
    ticket.paystackReference.includes(pattern)
  );
}

// Run the debug
if (import.meta.url === `file://${process.argv[1]}`) {
  debugFrontendPhantomTickets().catch(console.error);
}

export { debugFrontendPhantomTickets }; 