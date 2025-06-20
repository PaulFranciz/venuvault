#!/usr/bin/env node

/**
 * Debug Empty User ID Issue
 * 
 * This script tests what happens when we query tickets with an empty user ID,
 * which might be causing the phantom tickets to appear for fresh accounts
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';

async function debugEmptyUserId() {
  console.log('🔍 DEBUGGING EMPTY USER ID ISSUE');
  console.log('=================================');
  console.log('Testing what happens when we query tickets with empty user ID');
  console.log('');

  const testEventId = 'jh72w4qzh8a143vfhy67m2nzy57j644n'; // TICWAKA event

  // Test 1: Empty string user ID
  console.log('📊 Test 1: Empty String User ID ("")');
  console.log('-'.repeat(40));
  
  try {
    const emptyStringResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEvent',
        args: { 
          eventId: testEventId,
          userId: "" // Empty string
        }
      })
    });
    
    const emptyStringResult = await emptyStringResponse.json();
    const emptyStringTicket = emptyStringResult.status === 'success' ? emptyStringResult.value : emptyStringResult;
    
    console.log(`Response Status: ${emptyStringResponse.status}`);
    console.log(`Ticket Found: ${emptyStringTicket ? 'YES - THIS IS THE BUG!' : 'NO'}`);
    
    if (emptyStringTicket) {
      console.log('❌ PHANTOM TICKET FROM EMPTY USER ID:');
      console.log(`   - Ticket ID: ${emptyStringTicket._id}`);
      console.log(`   - Status: ${emptyStringTicket.status}`);
      console.log(`   - Paystack Ref: ${emptyStringTicket.paystackReference || 'None'}`);
      console.log(`   - User ID in ticket: "${emptyStringTicket.userId}"`);
    }
  } catch (error) {
    console.error('❌ Error with empty string:', error.message);
  }

  // Test 2: Null user ID
  console.log('\n📊 Test 2: Null User ID');
  console.log('-'.repeat(30));
  
  try {
    const nullResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getUserTicketForEvent',
        args: { 
          eventId: testEventId,
          userId: null // Null
        }
      })
    });
    
    const nullResult = await nullResponse.json();
    const nullTicket = nullResult.status === 'success' ? nullResult.value : nullResult;
    
    console.log(`Response Status: ${nullResponse.status}`);
    console.log(`Ticket Found: ${nullTicket ? 'YES - PHANTOM TICKET!' : 'NO'}`);
    
    if (nullTicket) {
      console.log('❌ PHANTOM TICKET FROM NULL USER ID:');
      console.log(`   - Ticket ID: ${nullTicket._id}`);
      console.log(`   - User ID in ticket: "${nullTicket.userId}"`);
    }
  } catch (error) {
    console.error('❌ Error with null:', error.message);
  }

  // Test 3: Check if there are any tickets with empty user IDs in database
  console.log('\n📊 Test 3: Check Database for Empty User ID Tickets');
  console.log('-'.repeat(55));
  
  try {
    // Get all tickets for the event
    const allTicketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getEventTickets',
        args: { eventId: testEventId }
      })
    });
    
    const allTicketsResult = await allTicketsResponse.json();
    const allTickets = allTicketsResult.status === 'success' ? allTicketsResult.value : allTicketsResult;
    
    console.log(`Total tickets in event: ${allTickets?.length || 0}`);
    
    if (allTickets && allTickets.length > 0) {
      const emptyUserTickets = allTickets.filter(ticket => 
        ticket.userId === "" || 
        ticket.userId === null || 
        ticket.userId === undefined
      );
      
      if (emptyUserTickets.length > 0) {
        console.log(`❌ Found ${emptyUserTickets.length} tickets with empty user IDs:`);
        emptyUserTickets.forEach((ticket, index) => {
          console.log(`   ${index + 1}. Ticket: ${ticket._id}`);
          console.log(`      User ID: "${ticket.userId}"`);
          console.log(`      Status: ${ticket.status}`);
          console.log(`      Paystack: ${ticket.paystackReference || 'None'}`);
        });
      } else {
        console.log('✅ No tickets with empty user IDs found');
      }
    }
  } catch (error) {
    console.error('❌ Error checking database:', error.message);
  }

  // Test 4: Check JavaScript truthiness behavior
  console.log('\n📊 Test 4: JavaScript Truthiness Check');
  console.log('-'.repeat(40));
  
  console.log(`!!"" (empty string): ${!!""}`);
  console.log(`!!null: ${!!null}`);
  console.log(`!!undefined: ${!!undefined}`);
  console.log(`!!"valid-user-id": ${!!"valid-user-id"}`);
  
  console.log('\n🚨 ROOT CAUSE ANALYSIS:');
  console.log('The issue is in useUserTicketsWithCache.ts line 10:');
  console.log('  const shouldFetch = !!userId;');
  console.log('');
  console.log('When user?.id is undefined, it becomes "" (empty string)');
  console.log('!!"" evaluates to TRUE, so the hook tries to fetch tickets');
  console.log('This triggers a query with userId="" which might match tickets with empty userIds');
}

debugEmptyUserId().catch(console.error); 