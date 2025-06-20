#!/usr/bin/env node

/**
 * Script to debug why user tickets are not showing up in the /tickets page
 * This will help us understand if the issue is in the query filtering or data storage
 */

import { ConvexHttpClient } from "convex/browser";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://thoughtful-warthog-251.convex.cloud");

const TEST_USER_ID = 'user_2vKoofdZBctaJR92G35he8R4P9F';

console.log('🔍 Debugging User Tickets Issue');
console.log('='.repeat(50));
console.log(`User ID: ${TEST_USER_ID}`);

async function debugUserTickets() {
  try {
    console.log('\n1️⃣ Testing getUserTickets query...');
    
    // Test the current getUserTickets query
    const userTickets = await convex.query("events:getUserTickets", { 
      userId: TEST_USER_ID 
    });
    
    console.log(`📊 getUserTickets result: ${userTickets.length} tickets`);
    console.log('Tickets:', userTickets);
    
    console.log('\n2️⃣ Testing raw ticket query (bypass filtering)...');
    
    // Let's try to get tickets directly from the tickets table
    try {
      const allUserTickets = await convex.query("tickets:getUserTicketsRaw", { 
        userId: TEST_USER_ID 
      });
      
      console.log(`📊 Raw tickets query result: ${allUserTickets.length} tickets`);
      
      if (allUserTickets.length > 0) {
        console.log('\n🔍 Analyzing raw tickets:');
        allUserTickets.forEach((ticket, index) => {
          console.log(`\nTicket ${index + 1}:`);
          console.log(`  - ID: ${ticket._id}`);
          console.log(`  - Status: ${ticket.status}`);
          console.log(`  - Paystack Reference: ${ticket.paystackReference || 'undefined'}`);
          console.log(`  - Event ID: ${ticket.eventId}`);
          console.log(`  - Created: ${new Date(ticket._creationTime).toISOString()}`);
          
          // Check if this ticket would be filtered out
          let filtered = false;
          let filterReason = '';
          
          if (!ticket.paystackReference || 
              ticket.paystackReference === 'test' ||
              ticket.paystackReference.includes('test_ref_') ||
              ticket.paystackReference.includes('test_protection_check')) {
            filtered = true;
            filterReason = 'Test reference filter';
          }
          
          if (ticket.status !== 'valid' && ticket.status !== 'used') {
            filtered = true;
            filterReason += (filterReason ? ' + ' : '') + 'Status filter';
          }
          
          console.log(`  - Would be filtered: ${filtered}${filterReason ? ` (${filterReason})` : ''}`);
        });
        
        console.log('\n📋 Filter Analysis:');
        const validTickets = allUserTickets.filter(ticket => {
          return (ticket.paystackReference && 
                  ticket.paystackReference !== 'test' &&
                  !ticket.paystackReference.includes('test_ref_') &&
                  !ticket.paystackReference.includes('test_protection_check') &&
                  (ticket.status === 'valid' || ticket.status === 'used'));
        });
        
        console.log(`  - Total tickets: ${allUserTickets.length}`);
        console.log(`  - After filtering: ${validTickets.length}`);
        console.log(`  - Filtered out: ${allUserTickets.length - validTickets.length}`);
        
      } else {
        console.log('❌ No tickets found in database for this user');
      }
      
    } catch (error) {
      console.log('⚠️  Raw tickets query failed (likely function doesn\'t exist)');
      console.log('Creating alternative test...');
    }
    
    console.log('\n3️⃣ Checking recent purchases from localStorage...');
    
    // This would run in browser, but let's simulate
    console.log('   (Check browser localStorage for: ticwaka_recent_purchase)');
    
    console.log('\n4️⃣ Testing authentication state...');
    
    try {
      const authTest = await convex.query("users:getCurrentUser", {});
      console.log(`🔐 Auth test result: ${authTest ? 'User found' : 'No user'}`);
    } catch (error) {
      console.log('⚠️  Auth test failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error in debug process:', error.message);
    console.error('Full error:', error);
  }
}

// Additional test for database consistency
async function testDatabaseConsistency() {
  console.log('\n5️⃣ Testing database consistency...');
  
  try {
    // Test if we can query tickets at all
    console.log('🔍 Testing basic database connectivity...');
    
    // Get some events to verify database is working
    const events = await convex.query("events:get", {});
    console.log(`📊 Found ${events.length} events in database`);
    
    if (events.length > 0) {
      console.log(`   Latest event: ${events[0].name}`);
    }
    
  } catch (error) {
    console.error('❌ Database connectivity test failed:', error.message);
  }
}

// Run all tests
async function runAllTests() {
  await debugUserTickets();
  await testDatabaseConsistency();
  
  console.log('\n🏁 Debug Complete');
  console.log('\nNext steps:');
  console.log('1. Check if tickets exist in database but are being filtered');
  console.log('2. Verify Paystack reference values are not triggering test filters');
  console.log('3. Check authentication state consistency');
  console.log('4. Verify ticket status values are "valid" or "used"');
}

runAllTests().catch(console.error); 