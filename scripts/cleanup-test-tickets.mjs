#!/usr/bin/env node

/**
 * Cleanup Test Tickets Script
 * 
 * This script removes phantom test tickets from the database
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';

async function cleanupTestTickets() {
  console.log('🧹 CLEANING UP TEST TICKETS');
  console.log('============================');
  console.log('');

  // Note: Since we can't directly delete from Convex in this script,
  // we'll create a mutation to handle the cleanup
  
  console.log('⚠️  IMPORTANT: Test ticket cleanup needs to be done manually');
  console.log('');
  console.log('To clean up test tickets, you need to:');
  console.log('');
  console.log('1. Create a cleanup mutation in convex/tickets.ts:');
  console.log('');
  console.log(`export const cleanupTestTickets = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all tickets
    const allTickets = await ctx.db.query("tickets").collect();
    
    // Find test tickets
    const testTickets = allTickets.filter(ticket => 
      !ticket.paystackReference || 
      ticket.paystackReference === 'test' ||
      ticket.paystackReference.includes('test_ref_') ||
      ticket.paystackReference.includes('FREE-')
    );
    
    console.log(\`Found \${testTickets.length} test tickets to delete\`);
    
    // Delete test tickets
    for (const ticket of testTickets) {
      await ctx.db.delete(ticket._id);
      console.log(\`Deleted test ticket: \${ticket._id}\`);
    }
    
    return { deletedCount: testTickets.length };
  },
});`);
  
  console.log('');
  console.log('2. Call the mutation via Convex dashboard or API');
  console.log('');
  console.log('3. Verify cleanup by running the investigation script again');
  
  // Let's check current test tickets
  console.log('\n📊 Current Test Tickets Analysis:');
  console.log('-'.repeat(40));
  
  try {
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
      const testTickets = allTickets.filter(ticket => 
        !ticket.paystackReference || 
        ticket.paystackReference === 'test' ||
        ticket.paystackReference.includes('test_ref_') ||
        ticket.paystackReference.includes('FREE-')
      );
      
      console.log(`❌ Found ${testTickets.length} test tickets to clean up:`);
      testTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. ID: ${ticket._id} | User: ${ticket.userId} | Ref: ${ticket.paystackReference}`);
      });
      
      const validTickets = allTickets.filter(ticket => 
        ticket.paystackReference && 
        ticket.paystackReference !== 'test' &&
        !ticket.paystackReference.includes('test_ref_') &&
        !ticket.paystackReference.includes('FREE-')
      );
      
      console.log(`✅ Found ${validTickets.length} valid tickets (will be preserved)`);
    }
  } catch (error) {
    console.error('❌ Error analyzing tickets:', error.message);
  }
}

// Run the cleanup analysis
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanupTestTickets().catch(console.error);
}

export { cleanupTestTickets }; 