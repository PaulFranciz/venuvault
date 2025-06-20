#!/usr/bin/env node

/**
 * Test Phantom Tickets Fix
 * 
 * This script tests the complete user flow that's causing the phantom tickets bug:
 * 1. Event page showing "You have a ticket!" 
 * 2. User clicks "View Ticket"
 * 3. Ticket page tries to fetch ticket details
 * 4. Convex error occurs because ticket doesn't exist
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test configuration - use the organizer from the RAVE event
const TEST_CONFIG = {
  userId: 'user_2x3676Wr2uaeDul4flLUGvsOAOV', // From the screenshot
  eventId: 'jh716mjrw1nd9cven9w80k760s7j4a9j', // Known test event
  eventName: 'RAVE'
};

async function testPhantomTicketsFix() {
  console.log('🔍 TESTING PHANTOM TICKETS FIX');
  console.log('==============================');
  console.log(`User ID: ${TEST_CONFIG.userId}`);
  console.log(`Event ID: ${TEST_CONFIG.eventId}`);
  console.log('');

  // Step 1: Test what the event page sees (useUserTicketsWithCache)
  console.log('📊 Step 1: Testing Event Page User Ticket Check');
  console.log('-'.repeat(50));
  
  try {
    // Test the optimized Convex function directly
    const convexResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEventOptimized',
        args: { 
          userId: TEST_CONFIG.userId, 
          eventId: TEST_CONFIG.eventId 
        }
      })
    });
    
    const convexResult = await convexResponse.json();
    const convexTicket = convexResult.status === 'success' ? convexResult.value : convexResult;
    
    console.log(`✅ Convex Optimized Response: ${convexResponse.status}`);
    console.log(`📋 Convex Ticket Found: ${convexTicket ? 'YES' : 'NO'}`);
    
    if (convexTicket) {
      console.log(`   - Ticket ID: ${convexTicket._id}`);
      console.log(`   - Status: ${convexTicket.status}`);
      console.log(`   - Paystack Ref: ${convexTicket.paystackReference || 'None'}`);
    }
    
    // Test the API endpoint fallback
    const apiResponse = await fetch(`${BASE_URL}/api/users/${TEST_CONFIG.userId}/tickets?eventId=${TEST_CONFIG.eventId}`);
    const apiResult = await apiResponse.json();
    
    console.log(`✅ API Response: ${apiResponse.status}`);
    console.log(`📋 API Tickets Found: ${apiResult.tickets?.length || 0}`);
    
    if (apiResult.tickets && apiResult.tickets.length > 0) {
      console.log(`   - API Ticket ID: ${apiResult.tickets[0]._id}`);
      console.log(`   - API Status: ${apiResult.tickets[0].status}`);
    }
    
    // Step 2: Test what happens when user clicks "View Ticket"
    console.log('\\n🎫 Step 2: Testing View Ticket Flow');
    console.log('-'.repeat(40));
    
    const phantomTicketId = convexTicket?._id || apiResult.tickets?.[0]?._id;
    
    if (phantomTicketId) {
      console.log(`🔍 Testing ticket details for ID: ${phantomTicketId}`);
      
      // Test getTicketWithDetails - this is what causes the error
      const ticketDetailsResponse = await fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'tickets:getTicketWithDetails',
          args: { ticketId: phantomTicketId }
        })
      });
      
      const ticketDetailsResult = await ticketDetailsResponse.json();
      const ticketDetails = ticketDetailsResult.status === 'success' ? ticketDetailsResult.value : ticketDetailsResult;
      
      console.log(`✅ Ticket Details Response: ${ticketDetailsResponse.status}`);
      
      if (ticketDetailsResult.status === 'error') {
        console.log('❌ PHANTOM TICKET ERROR DETECTED!');
        console.log(`   Error: ${ticketDetailsResult.message || 'Unknown error'}`);
        console.log('   This is what causes the Convex error when users click "View Ticket"');
      } else if (ticketDetails) {
        console.log('✅ Ticket details found successfully');
        console.log(`   - Ticket exists: YES`);
        console.log(`   - Event attached: ${ticketDetails.event ? 'YES' : 'NO'}`);
      } else {
        console.log('⚠️  Ticket details returned null (ticket doesn\'t exist)');
      }
    } else {
      console.log('✅ No phantom ticket ID found - this is correct!');
    }
    
    // Step 3: Test clean database state
    console.log('\\n🗄️  Step 3: Database State Verification');
    console.log('-'.repeat(45));
    
    // Check all tickets for this user
    const allTicketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getUserTickets',
        args: { userId: TEST_CONFIG.userId }
      })
    });
    
    const allTicketsResult = await allTicketsResponse.json();
    const allTickets = allTicketsResult.status === 'success' ? allTicketsResult.value : allTicketsResult;
    
    console.log(`📊 Total tickets in database: ${allTickets?.length || 0}`);
    
    if (allTickets && allTickets.length > 0) {
      console.log('🎫 User tickets in database:');
      allTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. ${ticket._id} - ${ticket.event?.name || 'Unknown'} - ${ticket.status}`);
        console.log(`      Paystack: ${ticket.paystackReference || 'None'}`);
      });
    } else {
      console.log('✅ Clean database state - no tickets found');
    }
    
  } catch (error) {
    console.error('❌ Error in phantom tickets test:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Phantom Tickets Fix Test Suite');
  console.log('===========================================\\n');
  
  await testPhantomTicketsFix();
  
  console.log('\\n📝 TEST SUMMARY');
  console.log('===============');
  console.log('✅ If no phantom tickets are found: Fix is working correctly');
  console.log('❌ If phantom tickets are found: Issue still exists');
  console.log('⚠️  If Convex errors occur: This is the root cause of user issues');
}

runTests().catch(console.error); 