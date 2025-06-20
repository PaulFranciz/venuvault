#!/usr/bin/env node

/**
 * Investigation Script for New Phantom Tickets (RAVE Event)
 * 
 * This script investigates the RAVE event where organizers are automatically
 * getting "You have a ticket!" messages without purchasing
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';

// New event details from the screenshot
const NEW_EVENT_CONFIG = {
  // We need to find the actual event ID for the RAVE event
  eventName: 'RAVE',
  organizerUserId: 'user_2x3676Wr2uaeDul4flLUGvsOAOV', // From the screenshot
  location: 'State Housing Estate, 6 Bishop Moynagh Ave, Atekong, Calabar 540222'
};

async function investigateNewPhantomTickets() {
  console.log('🔍 INVESTIGATING NEW PHANTOM TICKETS (RAVE EVENT)');
  console.log('==================================================');
  console.log(`Organizer ID: ${NEW_EVENT_CONFIG.organizerUserId}`);
  console.log(`Event Name: ${NEW_EVENT_CONFIG.eventName}`);
  console.log('');

  // Step 1: Find the RAVE event
  console.log('📊 Step 1: Finding the RAVE Event');
  console.log('-'.repeat(40));
  
  let raveEvent = null;
  
  try {
    // Get all events by the organizer
    const eventsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getSellerEvents',
        args: { userId: NEW_EVENT_CONFIG.organizerUserId }
      })
    });
    
    const eventsResult = await eventsResponse.json();
    const events = eventsResult.status === 'success' ? eventsResult.value : eventsResult;
    
    if (events && events.length > 0) {
      console.log(`📋 Found ${events.length} events by organizer`);
      
      // Find the RAVE event
      raveEvent = events.find(event => 
        event.name === NEW_EVENT_CONFIG.eventName ||
        event.name.includes('RAVE') ||
        event.location?.includes('State Housing Estate')
      );
      
      if (raveEvent) {
        console.log(`✅ Found RAVE event: ${raveEvent._id}`);
        console.log(`   Name: ${raveEvent.name}`);
        console.log(`   Location: ${raveEvent.location}`);
        console.log(`   Created: ${new Date(raveEvent._creationTime).toLocaleString()}`);
        console.log(`   Published: ${raveEvent.isPublished ? 'Yes' : 'No'}`);
      } else {
        console.log('❌ RAVE event not found in organizer events');
        console.log('Available events:');
        events.forEach((event, index) => {
          console.log(`   ${index + 1}. ${event.name} (${event._id})`);
        });
      }
    } else {
      console.log('❌ No events found for organizer');
    }
  } catch (error) {
    console.error('❌ Error finding RAVE event:', error.message);
  }

  if (!raveEvent) {
    console.log('\n⚠️  Cannot continue investigation without finding the RAVE event');
    return;
  }

  // Step 2: Check tickets for the RAVE event
  console.log('\n📊 Step 2: Checking Tickets for RAVE Event');
  console.log('-'.repeat(40));
  
  try {
    const ticketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getEventTickets',
        args: { eventId: raveEvent._id }
      })
    });
    
    const ticketsResult = await ticketsResponse.json();
    const tickets = ticketsResult.status === 'success' ? ticketsResult.value : ticketsResult;
    
    if (tickets && tickets.length > 0) {
      console.log(`❌ Found ${tickets.length} tickets for RAVE event:`);
      tickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. User: ${ticket.userId}`);
        console.log(`      - Ticket ID: ${ticket._id}`);
        console.log(`      - Status: ${ticket.status}`);
        console.log(`      - Amount: ${ticket.amount}`);
        console.log(`      - Paystack Ref: ${ticket.paystackReference || 'MISSING'}`);
        console.log(`      - Purchase Date: ${new Date(ticket.purchasedAt).toLocaleString()}`);
        console.log(`      - Ticket Type: ${ticket.ticketTypeId || 'UNKNOWN'}`);
        console.log('');
      });
    } else {
      console.log('✅ No tickets found for RAVE event (expected for new event)');
    }
  } catch (error) {
    console.error('❌ Error checking event tickets:', error.message);
  }

  // Step 3: Check if organizer has a ticket for this event
  console.log('📊 Step 3: Checking if Organizer Has Ticket');
  console.log('-'.repeat(40));
  
  try {
    const organizerTicketResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEvent',
        args: { 
          userId: NEW_EVENT_CONFIG.organizerUserId,
          eventId: raveEvent._id
        }
      })
    });
    
    const organizerTicketResult = await organizerTicketResponse.json();
    const organizerTicket = organizerTicketResult.status === 'success' ? organizerTicketResult.value : organizerTicketResult;
    
    if (organizerTicket) {
      console.log('❌ PHANTOM TICKET FOUND! Organizer has ticket:');
      console.log(`   - Ticket ID: ${organizerTicket._id}`);
      console.log(`   - Status: ${organizerTicket.status}`);
      console.log(`   - Amount: ${organizerTicket.amount}`);
      console.log(`   - Paystack Ref: ${organizerTicket.paystackReference || 'MISSING'}`);
      console.log(`   - Purchase Date: ${new Date(organizerTicket.purchasedAt).toLocaleString()}`);
    } else {
      console.log('✅ No phantom ticket found for organizer (filtering working)');
    }
  } catch (error) {
    console.error('❌ Error checking organizer ticket:', error.message);
  }

  // Step 4: Check API endpoint behavior
  console.log('\n📊 Step 4: Testing API Endpoint Behavior');
  console.log('-'.repeat(40));
  
  try {
    const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
    const apiResponse = await fetch(`${BASE_URL}/api/users/${NEW_EVENT_CONFIG.organizerUserId}/tickets?eventId=${raveEvent._id}`);
    const apiResult = await apiResponse.json();
    
    console.log(`API Response Status: ${apiResponse.status}`);
    
    if (apiResult.tickets && Array.isArray(apiResult.tickets) && apiResult.tickets.length > 0) {
      console.log('❌ API RETURNING PHANTOM TICKETS:');
      apiResult.tickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. Ticket ID: ${ticket._id || 'Unknown'}`);
        console.log(`      - Paystack Ref: ${ticket.paystackReference || 'MISSING'}`);
        console.log(`      - Amount: ${ticket.amount}`);
      });
    } else {
      console.log('✅ API correctly returns no tickets');
    }
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error.message);
  }

  // Step 5: Check waiting list entries
  console.log('\n📊 Step 5: Checking Waiting List Entries');
  console.log('-'.repeat(40));
  
  try {
    const waitlistResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'waitingList:getByEvent',
        args: { eventId: raveEvent._id }
      })
    });
    
    const waitlistResult = await waitlistResponse.json();
    
    if (waitlistResult.status === 'success' && waitlistResult.value && waitlistResult.value.length > 0) {
      console.log(`📋 Found ${waitlistResult.value.length} waiting list entries:`);
      waitlistResult.value.forEach((entry, index) => {
        console.log(`   ${index + 1}. User: ${entry.userId}`);
        console.log(`      - Status: ${entry.status}`);
        console.log(`      - Created: ${new Date(entry._creationTime).toLocaleString()}`);
      });
    } else {
      console.log('✅ No waiting list entries found');
    }
  } catch (error) {
    console.log('⚠️  Could not check waiting list (may not have query available)');
  }

  // Step 6: Check for any free ticket creation
  console.log('\n📊 Step 6: Analysis and Recommendations');
  console.log('-'.repeat(40));
  
  console.log('🎯 POTENTIAL CAUSES:');
  console.log('1. Event creation automatically creates a complimentary ticket for organizer');
  console.log('2. Free event tickets being automatically assigned');
  console.log('3. Event publication triggering ticket creation');
  console.log('4. Caching issues showing stale/wrong data');
  console.log('5. Frontend showing incorrect state');
  console.log('');
  
  console.log('🔍 NEXT INVESTIGATION STEPS:');
  console.log('1. Check if RAVE event has free tickets');
  console.log('2. Look for event creation hooks that create tickets');
  console.log('3. Check frontend logic for "You have a ticket" display');
  console.log('4. Verify no automatic complimentary ticket logic');
  console.log('5. Test with a fresh event creation');
  
  return raveEvent;
}

// Run the investigation
if (import.meta.url === `file://${process.argv[1]}`) {
  investigateNewPhantomTickets().catch(console.error);
}

export { investigateNewPhantomTickets }; 