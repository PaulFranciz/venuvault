#!/usr/bin/env node

import fetch from 'node-fetch';

const CONVEX_URL = 'https://clear-hummingbird-571.convex.cloud';
const BASE_URL = 'http://localhost:3000';
const TEST_USER_ID = 'user_2vIL4uwniO0WzDdyaAQ6CdjVW4V';
const TEST_EVENT_ID = 'jh716mjrw1nd9cven9w80k760s7j4a9j';

console.log('🔍 Debug: Ticket Clicking Issue');
console.log('=================================\n');

// Test 1: Check what getUserTickets returns
async function testGetUserTickets() {
  console.log('1. Testing getUserTickets query...');
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'events:getUserTickets',
        args: { userId: TEST_USER_ID }
      })
    });
    
    const result = await response.json();
    const tickets = result.status === 'success' ? result.value : result;
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Tickets found: ${tickets?.length || 0}`);
    
    if (tickets && tickets.length > 0) {
      console.log('   Ticket details:');
      tickets.forEach((ticket, index) => {
        console.log(`     ${index + 1}. ID: ${ticket._id}`);
        console.log(`        Event: ${ticket.event?.name || 'No event'}`);
        console.log(`        Status: ${ticket.status}`);
        console.log(`        Has Event: ${!!ticket.event}`);
      });
      return tickets;
    } else {
      console.log('   ❌ No tickets found');
      return [];
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return [];
  }
}

// Test 2: Test individual ticket details
async function testTicketDetails(ticketId) {
  console.log(`\n2. Testing getTicketWithDetails for ticket: ${ticketId}...`);
  try {
    const response = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getTicketWithDetails',
        args: { ticketId }
      })
    });
    
    const result = await response.json();
    const ticket = result.status === 'success' ? result.value : result;
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Ticket found: ${!!ticket}`);
    
    if (ticket) {
      console.log('   Ticket details:');
      console.log(`     ID: ${ticket._id}`);
      console.log(`     User ID: ${ticket.userId}`);
      console.log(`     Event: ${ticket.event?.name || 'No event'}`);
      console.log(`     Has Event: ${!!ticket.event}`);
      console.log(`     Status: ${ticket.status}`);
      return ticket;
    } else {
      console.log('   ❌ No ticket found');
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

// Test 3: Test the Next.js API route
async function testNextJSTicketRoute(ticketId) {
  console.log(`\n3. Testing Next.js ticket page route: /tickets/${ticketId}...`);
  try {
    const response = await fetch(`${BASE_URL}/tickets/${ticketId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TicketDebugger/1.0)'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);
    
    if (response.status === 200) {
      const html = await response.text();
      const hasTicketComponent = html.includes('Ticket') || html.includes('ticket');
      const hasError = html.includes('error') || html.includes('Error');
      const hasRedirect = html.includes('redirect') || response.url !== `${BASE_URL}/tickets/${ticketId}`;
      
      console.log(`   Has ticket content: ${hasTicketComponent}`);
      console.log(`   Has errors: ${hasError}`);
      console.log(`   Was redirected: ${hasRedirect}`);
      
      if (hasError) {
        // Extract error messages
        const errorMatch = html.match(/error[^<]*([^<]+)/gi);
        if (errorMatch) {
          console.log(`   Error details: ${errorMatch.slice(0, 2).join(', ')}`);
        }
      }
      
      return true;
    } else if (response.status === 302 || response.status === 307) {
      console.log(`   ❌ Redirected to: ${response.headers.get('location')}`);
      return false;
    } else {
      console.log(`   ❌ Failed with status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return false;
  }
}

// Test 4: Test authentication state
async function testAuthState() {
    console.log('\n4. Testing authentication state...');
    try {
      const response = await fetch(`${BASE_URL}/tickets`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; TicketDebugger/1.0)'
        }
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.status === 200) {
        const html = await response.text();
        const hasSignIn = html.includes('sign-in') || html.includes('Sign in');
        const hasTickets = html.includes('My Tickets') || html.includes('tickets');
        const hasAuth = html.includes('user') || html.includes('User');
        
        console.log(`   Has sign-in prompt: ${hasSignIn}`);
        console.log(`   Has tickets page: ${hasTickets}`);
        console.log(`   Has auth content: ${hasAuth}`);
        
        return !hasSignIn && hasTickets;
      } else {
        console.log(`   ❌ Failed with status: ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      return false;
    }
}

// Main execution
async function main() {
  // Test getUserTickets
  const tickets = await testGetUserTickets();
  
  if (tickets.length === 0) {
    console.log('\n❌ ISSUE: No tickets found for user');
    console.log('   This explains why the tickets page is empty');
    return;
  }
  
  // Test individual ticket details
  const firstTicket = tickets[0];
  const ticketDetails = await testTicketDetails(firstTicket._id);
  
  if (!ticketDetails) {
    console.log('\n❌ ISSUE: Cannot fetch individual ticket details');
    console.log('   This would cause the ticket page to fail');
    return;
  }
  
  // Test Next.js route
  const routeWorks = await testNextJSTicketRoute(firstTicket._id);
  
  if (!routeWorks) {
    console.log('\n❌ ISSUE: Next.js ticket page route is failing');
    console.log('   This explains why clicking tickets doesn\'t work');
  }
  
  // Test auth state
  const authWorks = await testAuthState();
  
  if (!authWorks) {
    console.log('\n❌ ISSUE: Authentication problem on tickets page');
    console.log('   Users might be getting redirected to sign-in');
  }
  
  // Summary
  console.log('\n📋 DIAGNOSIS SUMMARY');
  console.log('===================');
  
  if (tickets.length > 0 && ticketDetails && routeWorks && authWorks) {
    console.log('✅ All tests passed - ticket functionality should be working');
  } else {
    console.log('❌ Issues found:');
    if (tickets.length === 0) console.log('   - No tickets in database');
    if (!ticketDetails) console.log('   - Cannot fetch individual ticket details');
    if (!routeWorks) console.log('   - Next.js ticket page route failing');
    if (!authWorks) console.log('   - Authentication issues on tickets page');
  }
  
  console.log('\n🔧 RECOMMENDED ACTIONS:');
  if (tickets.length === 0) {
    console.log('   1. Check if user has actually purchased tickets');
    console.log('   2. Verify getUserTickets query is working correctly');
  }
  if (!ticketDetails) {
    console.log('   1. Check getTicketWithDetails query in Convex');
    console.log('   2. Verify ticket IDs are valid');
  }
  if (!routeWorks) {
    console.log('   1. Check /tickets/[id]/page.tsx for errors');
    console.log('   2. Verify authentication logic in ticket page');
  }
  if (!authWorks) {
    console.log('   1. Check authentication state in the app');
    console.log('   2. Verify user is properly signed in');
  }
}

main().catch(console.error); 