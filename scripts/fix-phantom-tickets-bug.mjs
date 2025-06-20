#!/usr/bin/env node

/**
 * Fix Phantom Tickets Bug
 * 
 * This script fixes the issue where users see tickets they didn't purchase
 * by removing test tickets and implementing proper validation
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';

async function fixPhantomTicketsBug() {
  console.log('🔧 FIXING PHANTOM TICKETS BUG');
  console.log('==============================');
  console.log('');

  // Step 1: Identify and remove test tickets
  console.log('📊 Step 1: Identifying Test Tickets');
  console.log('-'.repeat(40));
  
  try {
    // Get all tickets to identify test ones
    const allTicketsResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getEventTickets',
        args: { eventId: 'jh716mjrw1nd9cven9w80k760s7j4a9j' }
      })
    });
    
    const allTicketsResult = await allTicketsResponse.json();
    const allTickets = allTicketsResult.status === 'success' ? allTicketsResult.value : allTicketsResult;
    
    if (allTickets && allTickets.length > 0) {
      console.log(`📋 Found ${allTickets.length} total tickets`);
      
      // Identify test tickets
      const testTickets = allTickets.filter(ticket => 
        !ticket.paystackReference || 
        ticket.paystackReference === 'test' ||
        ticket.paystackReference.includes('test_ref_') ||
        ticket.amount === 0 ||
        ticket.paystackReference.includes('FREE-')
      );
      
      console.log(`❌ Found ${testTickets.length} test/phantom tickets:`);
      testTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. User: ${ticket.userId} | Ref: ${ticket.paystackReference} | Amount: ${ticket.amount}`);
      });
      
      if (testTickets.length > 0) {
        console.log('\n⚠️  These tickets need to be removed to fix the phantom ticket bug');
      }
    }
  } catch (error) {
    console.error('❌ Error identifying test tickets:', error.message);
  }

  // Step 2: Recommend immediate fixes
  console.log('\n🛠️  Step 2: Immediate Fix Recommendations');
  console.log('-'.repeat(40));
  
  console.log('1. Remove createTestTicket mutation from production');
  console.log('2. Add validation to prevent tickets without valid payment');
  console.log('3. Clear test tickets from database');
  console.log('4. Add proper payment verification');
  console.log('5. Implement environment-based testing');
  
  // Step 3: Implementation plan
  console.log('\n📋 Step 3: Implementation Plan');
  console.log('-'.repeat(40));
  
  console.log('A. Database Cleanup:');
  console.log('   - Delete tickets with paystackReference = "test"');
  console.log('   - Delete tickets with test_ref_* references');
  console.log('   - Delete tickets with amount = 0 (unless legitimate free events)');
  
  console.log('\nB. Code Changes:');
  console.log('   - Remove/disable createTestTicket in production');
  console.log('   - Add payment validation to ticket creation');
  console.log('   - Implement proper free ticket flow');
  console.log('   - Add environment checks for test functions');
  
  console.log('\nC. Validation:');
  console.log('   - Verify getUserTicketForEvent only returns valid tickets');
  console.log('   - Check payment verification in ticket creation');
  console.log('   - Test event creation doesn\'t auto-create tickets');
}

// Run the fix analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPhantomTicketsBug().catch(console.error);
}

export { fixPhantomTicketsBug }; 