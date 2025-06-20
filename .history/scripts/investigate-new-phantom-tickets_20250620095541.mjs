#!/usr/bin/env node

/**
 * Investigation Script for New Phantom Tickets (Fresh Account Issue)
 * 
 * This script investigates why fresh Google accounts are automatically
 * getting "You have a ticket!" messages without purchasing
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';

// New event and user from the latest issue
const INVESTIGATION_CONFIG = {
  // New event created: TICWAKA
  newEventId: 'jh72w4qzh8a143vfhy67m2nzy57j644n',
  // New user ID from the screenshot  
  newUserId: 'user_2vKoofdZBctaJR92G35he8R4P9F',
  eventName: 'TICWAKA'
};

async function investigateNewPhantomTickets() {
  console.log('🔍 INVESTIGATING NEW PHANTOM TICKETS (FRESH ACCOUNT ISSUE)');
  console.log('=========================================================');
  console.log(`New Event ID: ${INVESTIGATION_CONFIG.newEventId}`);
  console.log(`New User ID: ${INVESTIGATION_CONFIG.newUserId}`);
  console.log(`Event Name: ${INVESTIGATION_CONFIG.eventName}`);
  console.log('');
  console.log('⚠️  CRITICAL: This is happening on FRESH Google accounts & NEW devices!');
  console.log('This means it\'s NOT a caching issue - there\'s a logic bug creating phantom tickets');
  console.log('');

  // Step 1: Check if the new user has any tickets for the new event
  console.log('📊 Step 1: Check New User Tickets for New Event');
  console.log('-'.repeat(50));
  
  try {
    // Test getUserTicketForEvent for the new user/event combination
    const userTicketResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEvent',
        args: { 
          eventId: INVESTIGATION_CONFIG.newEventId,
          userId: INVESTIGATION_CONFIG.newUserId 
        }
      })
    });
    
    const userTicketResult = await userTicketResponse.json();
    const userTicket = userTicketResult.status === 'success' ? userTicketResult.value : userTicketResult;
    
    console.log(`✅ getUserTicketForEvent Response: ${userTicketResponse.status}`);
    console.log(`📋 Ticket Found: ${userTicket ? 'YES - PHANTOM TICKET DETECTED!' : 'NO'}`);
    
    if (userTicket) {
      console.log('❌ PHANTOM TICKET DETAILS:');
      console.log(`   - Ticket ID: ${userTicket._id}`);
      console.log(`   - Status: ${userTicket.status}`);
      console.log(`   - Paystack Ref: ${userTicket.paystackReference || 'None'}`);
      console.log(`   - Amount: ${userTicket.amount || 'N/A'}`);
      console.log(`   - Created: ${userTicket._creationTime ? new Date(userTicket._creationTime).toISOString() : 'N/A'}`);
    }
    
    // Test the optimized version too
    const optimizedResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEventOptimized',
        args: { 
          eventId: INVESTIGATION_CONFIG.newEventId,
          userId: INVESTIGATION_CONFIG.newUserId 
        }
      })
    });
    
    const optimizedResult = await optimizedResponse.json();
    const optimizedTicket = optimizedResult.status === 'success' ? optimizedResult.value : optimizedResult;
    
    console.log(`✅ getUserTicketForEventOptimized Response: ${optimizedResponse.status}`);
    console.log(`📋 Optimized Ticket Found: ${optimizedTicket ? 'YES - PHANTOM TICKET!' : 'NO'}`);

  } catch (error) {
    console.error('❌ Error checking user tickets:', error.message);
  }

  // Step 2: Check all tickets for this new user
  console.log('\n📊 Step 2: Check All User Tickets');
  console.log('-'.repeat(35));
  
  try {
    const allTicketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getUserTickets',
        args: { userId: INVESTIGATION_CONFIG.newUserId }
      })
    });
    
    const allTicketsResult = await allTicketsResponse.json();
    const allTickets = allTicketsResult.status === 'success' ? allTicketsResult.value : allTicketsResult;
    
    console.log(`📊 Total tickets for new user: ${allTickets?.length || 0}`);
    
    if (allTickets && allTickets.length > 0) {
      console.log('🎫 All user tickets:');
      allTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. ${ticket._id} - ${ticket.event?.name || 'Unknown'} - ${ticket.status}`);
        console.log(`      Paystack: ${ticket.paystackReference || 'None'}`);
        console.log(`      Amount: ${ticket.amount || 'N/A'}`);
        console.log(`      Created: ${ticket._creationTime ? new Date(ticket._creationTime).toISOString() : 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error fetching all user tickets:', error.message);
  }

  // Step 3: Check all tickets for the new event
  console.log('📊 Step 3: Check All Event Tickets');
  console.log('-'.repeat(35));
  
  try {
    const eventTicketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getEventTickets',
        args: { eventId: INVESTIGATION_CONFIG.newEventId }
      })
    });
    
    const eventTicketsResult = await eventTicketsResponse.json();
    const eventTickets = eventTicketsResult.status === 'success' ? eventTicketsResult.value : eventTicketsResult;
    
    console.log(`📊 Total tickets for new event: ${eventTickets?.length || 0}`);
    
    if (eventTickets && eventTickets.length > 0) {
      console.log('🎫 All event tickets:');
      eventTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. User: ${ticket.userId} - Status: ${ticket.status}`);
        console.log(`      Paystack: ${ticket.paystackReference || 'None'}`);
        console.log(`      Amount: ${ticket.amount || 'N/A'}`);
        console.log(`      Created: ${ticket._creationTime ? new Date(ticket._creationTime).toISOString() : 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error fetching event tickets:', error.message);
  }

  // Step 4: Look for automatic ticket creation logic
  console.log('🔍 Step 4: Potential Root Causes');
  console.log('-'.repeat(35));
  console.log('');
  console.log('🚨 POSSIBLE CAUSES OF AUTOMATIC PHANTOM TICKETS:');
  console.log('1. Event creation automatically creates organizer ticket');
  console.log('2. Viewing event page triggers automatic ticket creation');
  console.log('3. Join queue/reservation logic creating tickets prematurely');
  console.log('4. Free event logic automatically granting tickets');
  console.log('5. Test code still running in production');
  console.log('');
  console.log('📋 NEXT INVESTIGATION STEPS:');
  console.log('1. Check event creation code for automatic ticket generation');
  console.log('2. Check event viewing code for side effects');
  console.log('3. Check if this is a free event triggering auto-tickets');
  console.log('4. Check queue/reservation mutations for ticket creation');
  console.log('5. Check for any test/demo code still active');
}

investigateNewPhantomTickets().catch(console.error); 