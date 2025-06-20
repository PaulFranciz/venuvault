#!/usr/bin/env node

/**
 * Create Test Ticket Script
 * 
 * This script manually creates a test ticket in the database
 * to verify that the "My Tickets" page displays tickets correctly
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';
const TEST_EVENT_ID = 'jh716mjrw1nd9cven9w80k760s7j4a9j';
const TEST_USER_ID = 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V';

console.log('🎫 CREATING TEST TICKET');
console.log('=======================\n');

async function createTestTicket() {
  try {
    console.log('Creating test ticket...');
    
    // Create a ticket directly in the database
    const response = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:createTestTicket',
        args: {
          eventId: TEST_EVENT_ID,
          userId: TEST_USER_ID,
          ticketTypeId: 'ticket-1750337556957',
          status: 'valid',
          amount: 5000,
          currency: 'NGN',
          paystackReference: `test_ref_${Date.now()}`
        }
      })
    });
    
    const result = await response.json();
    console.log('Create ticket result:', result);
    
    if (result.status === 'success') {
      console.log('✅ Test ticket created successfully!');
      console.log(`   Ticket ID: ${result.value}`);
      
      // Now test if the user can see it
      console.log('\nTesting ticket visibility...');
      
      const ticketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: 'events:getUserTickets',
          args: { userId: TEST_USER_ID }
        })
      });
      
      const ticketsResult = await ticketsResponse.json();
      const tickets = ticketsResult.status === 'success' ? ticketsResult.value : ticketsResult;
      
      console.log(`✅ User now has ${tickets?.length || 0} tickets`);
      
      if (tickets && tickets.length > 0) {
        console.log('✅ SUCCESS: Ticket creation and retrieval working!');
        tickets.forEach((ticket, index) => {
          console.log(`   Ticket ${index + 1}:`);
          console.log(`   - Event: ${ticket.event?.name || 'Unknown'}`);
          console.log(`   - Status: ${ticket.status}`);
          console.log(`   - Amount: ${ticket.amount || 'N/A'}`);
        });
      }
      
      return { success: true, ticketId: result.value };
    } else {
      console.log('❌ Failed to create test ticket');
      return { success: false, error: result };
    }
  } catch (error) {
    console.error('❌ Error creating test ticket:', error.message);
    return { success: false, error: error.message };
  }
}

// First, let me check if the createTestTicket mutation exists
async function checkMutationExists() {
  console.log('Checking if createTestTicket mutation exists...');
  
  try {
    const response = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:createTestTicket',
        args: {
          eventId: TEST_EVENT_ID,
          userId: TEST_USER_ID,
          ticketTypeId: 'test',
          status: 'valid',
          amount: 5000,
          currency: 'NGN',
          paystackReference: 'test'
        }
      })
    });
    
    const result = await response.json();
    
    if (result.error && result.error.includes('Unknown function')) {
      console.log('❌ createTestTicket mutation does not exist');
      console.log('   We need to create this mutation first');
      return false;
    }
    
    return true;
  } catch (error) {
    console.log('❌ Error checking mutation:', error.message);
    return false;
  }
}

async function testWithDirectInsert() {
  console.log('\n🔧 Testing with direct database insert simulation...');
  
  // Since we can't directly insert, let's test the existing flow
  // by checking what happens when we try to get tickets for a user who should have them
  
  try {
    // Test API endpoint
    const response = await fetch(`http://localhost:3000/api/users/${TEST_USER_ID}/tickets?eventId=${TEST_EVENT_ID}`);
    const ticket = await response.json();
    
    console.log(`API Response Status: ${response.status}`);
    console.log('API Response:', ticket);
    
    // Test Convex direct
    const convexResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getUserTickets',
        args: { userId: TEST_USER_ID }
      })
    });
    
    const convexResult = await convexResponse.json();
    const tickets = convexResult.status === 'success' ? convexResult.value : convexResult;
    
    console.log('Convex Response:', tickets);
    
    return { success: true };
  } catch (error) {
    console.error('Error in test:', error.message);
    return { success: false, error: error.message };
  }
}

// Run the test
async function main() {
  console.log(`🎯 Target Event: ${TEST_EVENT_ID}`);
  console.log(`👤 Test User: ${TEST_USER_ID}\n`);
  
  const mutationExists = await checkMutationExists();
  
  if (mutationExists) {
    await createTestTicket();
  } else {
    console.log('⚠️  createTestTicket mutation not found, running alternative test...');
    await testWithDirectInsert();
  }
}

main().catch(console.error); 