#!/usr/bin/env node

/**
 * Phantom Ticket Bug Investigation Script
 * 
 * This script investigates why users are seeing tickets they didn't purchase
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test configuration
const TEST_CONFIG = {
  eventId: 'jh716mjrw1nd9cven9w80k760s7j4a9j',
  userId: 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V', // Test user
  organizerUserId: 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V' // Organizer user
};

async function investigatePhantomTickets() {
  console.log('🔍 PHANTOM TICKET BUG INVESTIGATION');
  console.log('====================================');
  console.log(`Event ID: ${TEST_CONFIG.eventId}`);
  console.log(`Test User ID: ${TEST_CONFIG.userId}`);
  console.log('');

  // Step 1: Check if test user has any tickets in database
  console.log('📊 Step 1: Direct Database Check');
  console.log('-'.repeat(40));
  
  try {
    const userTicketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getUserTickets',
        args: { userId: TEST_CONFIG.userId }
      })
    });
    
    const userTicketsResult = await userTicketsResponse.json();
    const userTickets = userTicketsResult.status === 'success' ? userTicketsResult.value : userTicketsResult;
    
    console.log(`✅ User has ${userTickets?.length || 0} tickets in database`);
    
    if (userTickets && userTickets.length > 0) {
      console.log('📋 Ticket Details:');
      userTickets.forEach((ticket, index) => {
        console.log(`   Ticket ${index + 1}:`);
        console.log(`   - ID: ${ticket._id}`);
        console.log(`   - Event: ${ticket.event?.name || 'Unknown'}`);
        console.log(`   - Status: ${ticket.status}`);
        console.log(`   - Amount: ${ticket.amount || 'N/A'}`);
        console.log(`   - Paystack Ref: ${ticket.paystackReference || 'None'}`);
        console.log(`   - Purchase Date: ${ticket.purchasedAt ? new Date(ticket.purchasedAt).toISOString() : 'N/A'}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error fetching user tickets:', error.message);
  }

  // Step 2: Check specific event ticket
  console.log('📊 Step 2: Event-Specific Ticket Check');
  console.log('-'.repeat(40));
  
  try {
    const eventTicketResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEvent',
        args: { 
          userId: TEST_CONFIG.userId,
          eventId: TEST_CONFIG.eventId
        }
      })
    });
    
    const eventTicketResult = await eventTicketResponse.json();
    const eventTicket = eventTicketResult.status === 'success' ? eventTicketResult.value : eventTicketResult;
    
    if (eventTicket) {
      console.log('❌ PHANTOM TICKET FOUND!');
      console.log('   - Ticket ID:', eventTicket._id);
      console.log('   - Status:', eventTicket.status);
      console.log('   - Amount:', eventTicket.amount);
      console.log('   - Paystack Ref:', eventTicket.paystackReference);
      console.log('   - Purchase Date:', eventTicket.purchasedAt ? new Date(eventTicket.purchasedAt).toISOString() : 'N/A');
    } else {
      console.log('✅ No ticket found for this event (correct behavior)');
    }
  } catch (error) {
    console.error('❌ Error fetching event ticket:', error.message);
  }

  // Step 3: Check waiting list status
  console.log('📊 Step 3: Waiting List Status Check');
  console.log('-'.repeat(40));
  
  try {
    const queueResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'waitingList:getQueuePosition',
        args: { 
          userId: TEST_CONFIG.userId,
          eventId: TEST_CONFIG.eventId
        }
      })
    });
    
    const queueResult = await queueResponse.json();
    const queuePosition = queueResult.status === 'success' ? queueResult.value : queueResult;
    
    if (queuePosition) {
      console.log('📋 Queue Position Found:');
      console.log(`   - Status: ${queuePosition.status}`);
      console.log(`   - Position: ${queuePosition.position || 'N/A'}`);
      console.log(`   - Offer Expires: ${queuePosition.offerExpiresAt ? new Date(queuePosition.offerExpiresAt).toISOString() : 'N/A'}`);
      console.log(`   - Ticket Type: ${queuePosition.ticketTypeId || 'N/A'}`);
      console.log(`   - Quantity: ${queuePosition.quantity || 'N/A'}`);
    } else {
      console.log('✅ No queue position found');
    }
  } catch (error) {
    console.error('❌ Error fetching queue position:', error.message);
  }

  // Step 4: Check API endpoint behavior
  console.log('📊 Step 4: API Endpoint Behavior Check');
  console.log('-'.repeat(40));
  
  try {
    const apiResponse = await fetch(`${BASE_URL}/api/users/${TEST_CONFIG.userId}/tickets?eventId=${TEST_CONFIG.eventId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const apiResult = await apiResponse.json();
    console.log(`API Response Status: ${apiResponse.status}`);
    console.log('API Response:', JSON.stringify(apiResult, null, 2));
    
    if (apiResult.tickets && apiResult.tickets.length > 0) {
      console.log('❌ API RETURNING PHANTOM TICKETS!');
    } else {
      console.log('✅ API correctly returns no tickets');
    }
  } catch (error) {
    console.error('❌ Error testing API endpoint:', error.message);
  }

  // Step 5: Check all tickets for the event (organizer view)
  console.log('📊 Step 5: All Event Tickets Check');
  console.log('-'.repeat(40));
  
  try {
    const allTicketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getEventTickets',
        args: { eventId: TEST_CONFIG.eventId }
      })
    });
    
    const allTicketsResult = await allTicketsResponse.json();
    const allTickets = allTicketsResult.status === 'success' ? allTicketsResult.value : allTicketsResult;
    
    console.log(`📋 Total tickets for event: ${allTickets?.length || 0}`);
    
    if (allTickets && allTickets.length > 0) {
      console.log('Event Tickets:');
      allTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. User: ${ticket.userId} | Status: ${ticket.status} | Amount: ${ticket.amount || 'Free'} | Ref: ${ticket.paystackReference || 'None'}`);
      });
      
      // Check if our test user appears in the list
      const testUserTickets = allTickets.filter(t => t.userId === TEST_CONFIG.userId);
      if (testUserTickets.length > 0) {
        console.log(`❌ FOUND ${testUserTickets.length} PHANTOM TICKETS FOR TEST USER!`);
      }
    }
  } catch (error) {
    console.error('❌ Error fetching all event tickets:', error.message);
  }

  // Step 6: Check if there are any test tickets being created automatically
  console.log('📊 Step 6: Recent Ticket Creation Analysis');
  console.log('-'.repeat(40));
  
  try {
    // Check for recent tickets (last 24 hours)
    const recentTime = Date.now() - (24 * 60 * 60 * 1000);
    
    const recentTicketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getEventTickets',
        args: { eventId: TEST_CONFIG.eventId }
      })
    });
    
    const recentTicketsResult = await recentTicketsResponse.json();
    const allTickets = recentTicketsResult.status === 'success' ? recentTicketsResult.value : recentTicketsResult;
    
    if (allTickets && allTickets.length > 0) {
      const recentTickets = allTickets.filter(ticket => 
        ticket.purchasedAt && ticket.purchasedAt > recentTime
      );
      
      console.log(`📋 Recent tickets (last 24h): ${recentTickets.length}`);
      
      recentTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. User: ${ticket.userId}`);
        console.log(`      - Created: ${new Date(ticket.purchasedAt).toISOString()}`);
        console.log(`      - Status: ${ticket.status}`);
        console.log(`      - Amount: ${ticket.amount || 'Free'}`);
        console.log(`      - Payment Ref: ${ticket.paystackReference || 'None'}`);
        
        // Check if this looks like a test ticket
        if (!ticket.paystackReference || ticket.paystackReference.includes('test_')) {
          console.log(`      - ⚠️  SUSPICIOUS: Looks like a test ticket`);
        }
      });
    }
  } catch (error) {
    console.error('❌ Error analyzing recent tickets:', error.message);
  }

  // Step 7: Recommendations
  console.log('');
  console.log('💡 INVESTIGATION SUMMARY & RECOMMENDATIONS');
  console.log('==========================================');
  console.log('');
  console.log('Potential causes of phantom tickets:');
  console.log('1. Test tickets being created automatically');
  console.log('2. Free ticket flow creating tickets without payment');
  console.log('3. Caching issues showing stale data');
  console.log('4. Development/testing code left in production');
  console.log('5. Webhook processing creating duplicate tickets');
  console.log('');
  console.log('Next steps:');
  console.log('- Check for any createTestTicket calls in production');
  console.log('- Review free ticket processing logic');
  console.log('- Check webhook duplicate prevention');
  console.log('- Verify event publication doesn\'t create tickets');
  console.log('- Clear cache and test again');
}

// Run the investigation
if (import.meta.url === `file://${process.argv[1]}`) {
  investigatePhantomTickets().catch(console.error);
}

export { investigatePhantomTickets }; 