#!/usr/bin/env node

/**
 * Comprehensive Ticket Purchase Flow Test
 * 
 * Tests:
 * 1. Complete purchase flow simulation
 * 2. Ticket visibility in "My Tickets"
 * 3. Payment reflection in organizer dashboard
 * 4. Database integrity checks
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';
const TEST_EVENT_ID = 'jh716mjrw1nd9cven9w80k760s7j4a9j';

// Test user IDs
const TEST_USERS = {
  BUYER: 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V',
  ORGANIZER: 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V'
};

console.log('🧪 TICKET PURCHASE FLOW TESTING');
console.log('================================\n');

/**
 * Test 1: Check if user can see their tickets
 */
async function testUserTicketsVisibility() {
  console.log('📋 Test 1: User Tickets Visibility');
  console.log('----------------------------------');
  
  try {
    // Test the API endpoint that "My Tickets" page uses
    const response = await fetch(`${BASE_URL}/api/users/${TEST_USERS.BUYER}/tickets?eventId=${TEST_EVENT_ID}`);
    const ticket = await response.json();
    
    console.log(`✅ API Response Status: ${response.status}`);
    console.log(`📄 Ticket Data:`, ticket);
    
    if (ticket && ticket !== null) {
      console.log('✅ User has ticket data');
      return { success: true, hasTicket: true, ticket };
    } else {
      console.log('❌ User has no ticket data');
      return { success: true, hasTicket: false, ticket: null };
    }
  } catch (error) {
    console.error('❌ Error fetching user tickets:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Check Convex database directly for tickets
 */
async function testConvexTicketsDatabase() {
  console.log('\n🗄️  Test 2: Convex Database Tickets Check');
  console.log('------------------------------------------');
  
  try {
    // Direct Convex query to get user tickets
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getUserTickets',
        args: { userId: TEST_USERS.BUYER }
      })
    });
    
    const convexResponse = await response.json();
    const tickets = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
    
    console.log(`✅ Convex Response Status: ${response.status}`);
    console.log(`📊 Total Tickets Found: ${tickets?.length || 0}`);
    
    if (tickets && tickets.length > 0) {
      console.log('✅ User has tickets in database');
      tickets.forEach((ticket, index) => {
        console.log(`   Ticket ${index + 1}:`);
        console.log(`   - ID: ${ticket._id}`);
        console.log(`   - Event: ${ticket.eventId}`);
        console.log(`   - Status: ${ticket.status}`);
        console.log(`   - Amount: ${ticket.amount || 'N/A'}`);
        console.log(`   - Purchased: ${ticket.purchasedAt ? new Date(ticket.purchasedAt).toISOString() : 'N/A'}`);
      });
      return { success: true, tickets };
    } else {
      console.log('❌ No tickets found in database');
      return { success: true, tickets: [] };
    }
  } catch (error) {
    console.error('❌ Error querying Convex database:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: Check organizer dashboard data
 */
async function testOrganizerDashboard() {
  console.log('\n💼 Test 3: Organizer Dashboard Data');
  console.log('-----------------------------------');
  
  try {
    // Get seller events (what the dashboard shows)
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getSellerEvents',
        args: { userId: TEST_USERS.ORGANIZER }
      })
    });
    
    const convexResponse = await response.json();
    const events = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
    
    console.log(`✅ Convex Response Status: ${response.status}`);
    console.log(`📊 Total Events Found: ${events?.length || 0}`);
    
    if (events && events.length > 0) {
      const targetEvent = events.find(e => e._id === TEST_EVENT_ID);
      
      if (targetEvent) {
        console.log('✅ Target event found in dashboard');
        console.log(`   Event: ${targetEvent.name}`);
        console.log(`   Metrics:`, targetEvent.metrics);
        console.log(`   - Sold Tickets: ${targetEvent.metrics?.soldTickets || 0}`);
        console.log(`   - Revenue: ${targetEvent.metrics?.revenue || 0}`);
        console.log(`   - Refunded: ${targetEvent.metrics?.refundedTickets || 0}`);
        
        return { success: true, event: targetEvent, hasRevenue: (targetEvent.metrics?.revenue || 0) > 0 };
      } else {
        console.log('❌ Target event not found in organizer dashboard');
        return { success: true, event: null, hasRevenue: false };
      }
    } else {
      console.log('❌ No events found for organizer');
      return { success: true, events: [], hasRevenue: false };
    }
  } catch (error) {
    console.error('❌ Error fetching organizer dashboard:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: Simulate a ticket purchase (webhook simulation)
 */
async function simulateTicketPurchase() {
  console.log('\n🛒 Test 4: Simulate Ticket Purchase');
  console.log('-----------------------------------');
  
  try {
    // First, create a waiting list entry
    console.log('Creating waiting list entry...');
    const waitingListResponse = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:joinWaitingList',
        args: { 
          eventId: TEST_EVENT_ID, 
          userId: TEST_USERS.BUYER,
          ticketTypeId: 'general',
          quantity: 1
        }
      })
    });
    
    const waitingListResult = await waitingListResponse.json();
    console.log('Waiting list result:', waitingListResult);
    
    if (!waitingListResult.status === 'success') {
      throw new Error('Failed to join waiting list');
    }
    
    // Simulate payment webhook
    console.log('Simulating payment webhook...');
    const webhookPayload = {
      event: 'charge.success',
      data: {
        id: Math.floor(Math.random() * 1000000),
        status: 'success',
        reference: `test_ref_${Date.now()}`,
        amount: 500000, // 5000 NGN in kobo
        currency: 'NGN',
        metadata: JSON.stringify({
          eventId: TEST_EVENT_ID,
          userId: TEST_USERS.BUYER,
          waitingListId: waitingListResult.value?.waitingListId,
          tickets: [{ ticketTypeId: 'general', quantity: 1 }]
        }),
        customer: {
          email: 'test@example.com'
        }
      }
    };
    
    const webhookResponse = await fetch(`${BASE_URL}/api/webhooks/paystack`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-paystack-signature': 'test_signature' // This will fail signature verification
      },
      body: JSON.stringify(webhookPayload)
    });
    
    console.log(`Webhook Response Status: ${webhookResponse.status}`);
    console.log(`Webhook Response: ${await webhookResponse.text()}`);
    
    return { success: webhookResponse.status === 200 };
  } catch (error) {
    console.error('❌ Error simulating purchase:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test 5: Check event analytics
 */
async function testEventAnalytics() {
  console.log('\n📊 Test 5: Event Analytics Check');
  console.log('---------------------------------');
  
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getEventAnalytics',
        args: { eventId: TEST_EVENT_ID }
      })
    });
    
    const convexResponse = await response.json();
    const analytics = convexResponse.status === 'success' ? convexResponse.value : convexResponse;
    
    console.log(`✅ Analytics Response Status: ${response.status}`);
    
    if (analytics) {
      console.log('✅ Analytics data available');
      console.log(`   Total Revenue: ${analytics.revenue?.total || 0}`);
      console.log(`   Net Revenue: ${analytics.revenue?.net || 0}`);
      console.log(`   Sold Tickets: ${analytics.tickets?.sold || 0}`);
      console.log(`   Refunded Amount: ${analytics.revenue?.refunded || 0}`);
      console.log(`   Conversion Rate: ${analytics.waitingList?.conversionRate || 0}%`);
      console.log(`   Recent Sales (24h): ${analytics.recentActivity?.ticketsSoldLast24h || 0}`);
      
      return { 
        success: true, 
        analytics,
        hasRevenue: (analytics.revenue?.total || 0) > 0
      };
    } else {
      console.log('❌ No analytics data found');
      return { success: true, analytics: null, hasRevenue: false };
    }
  } catch (error) {
    console.error('❌ Error fetching analytics:', error.message);
    return { success: false, error: error.message, hasRevenue: false };
  }
}

/**
 * Main test execution
 */
async function runAllTests() {
  console.log(`🎯 Testing Event: ${TEST_EVENT_ID}`);
  console.log(`👤 Test Buyer: ${TEST_USERS.BUYER}`);
  console.log(`🏢 Test Organizer: ${TEST_USERS.ORGANIZER}\n`);
  
  const results = {
    userTickets: await testUserTicketsVisibility(),
    convexTickets: await testConvexTicketsDatabase(),
    organizerDashboard: await testOrganizerDashboard(),
    eventAnalytics: await testEventAnalytics()
  };
  
  // Summary
  console.log('\n📋 TEST SUMMARY');
  console.log('===============');
  
  console.log(`✅ User Tickets API: ${results.userTickets.success ? 'PASS' : 'FAIL'}`);
  console.log(`   - Has Ticket: ${results.userTickets.hasTicket ? 'YES' : 'NO'}`);
  
  console.log(`✅ Convex Database: ${results.convexTickets.success ? 'PASS' : 'FAIL'}`);
  console.log(`   - Tickets Count: ${results.convexTickets.tickets?.length || 0}`);
  
  console.log(`✅ Organizer Dashboard: ${results.organizerDashboard.success ? 'PASS' : 'FAIL'}`);
  console.log(`   - Has Revenue: ${results.organizerDashboard.hasRevenue ? 'YES' : 'NO'}`);
  
  console.log(`✅ Event Analytics: ${results.eventAnalytics.success ? 'PASS' : 'FAIL'}`);
  console.log(`   - Revenue: ${results.eventAnalytics.analytics?.revenue?.total || 0}`);
  
  // Diagnosis
  console.log('\n🔍 DIAGNOSIS');
  console.log('============');
  
  if (results.convexTickets.tickets?.length > 0) {
    console.log('✅ Tickets exist in database - purchase flow is working');
    
    if (!results.userTickets.hasTicket) {
      console.log('❌ ISSUE: Tickets not showing in "My Tickets" - API or caching issue');
    }
    
    if (!results.organizerDashboard.hasRevenue) {
      console.log('❌ ISSUE: Revenue not showing in dashboard - metrics calculation issue');
    }
  } else {
    console.log('❌ ISSUE: No tickets in database - purchase flow is broken');
    console.log('   - Check payment webhook processing');
    console.log('   - Check Convex purchaseTicket mutation');
  }
  
  return results;
}

// Run the tests
runAllTests().catch(console.error); 