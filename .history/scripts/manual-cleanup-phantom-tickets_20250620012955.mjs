#!/usr/bin/env node

/**
 * Manual Cleanup of Phantom Tickets
 * 
 * This script manually calls the Convex cleanup mutation to remove phantom tickets
 */

import fetch from 'node-fetch';

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://silent-mallard-468.convex.cloud';

async function manualCleanupPhantomTickets() {
  console.log('🧹 MANUAL PHANTOM TICKETS CLEANUP');
  console.log('==================================');
  console.log('');

  console.log('📋 Current phantom tickets to be removed:');
  console.log('   1. Paystack Ref: "test" (2 tickets)');
  console.log('   2. Paystack Ref: "test_ref_*" (2 tickets)');
  console.log('   3. Paystack Ref: "test_protection_check" (1 ticket)');
  console.log('   Total: 5 phantom tickets');
  console.log('');

  // Step 1: Call the cleanup mutation
  console.log('🔧 Step 1: Calling cleanup mutation');
  console.log('-'.repeat(40));
  
  try {
    const cleanupResponse = await fetch(`${CONVEX_URL}/api/mutation`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.CONVEX_DEPLOY_KEY || ''}`
      },
      body: JSON.stringify({
        path: 'tickets:cleanupTestTickets',
        args: {}
      })
    });
    
    const cleanupResult = await cleanupResponse.json();
    console.log('Cleanup response status:', cleanupResponse.status);
    console.log('Cleanup response:', cleanupResult);
    
    if (cleanupResult.status === 'success') {
      const result = cleanupResult.value;
      console.log(`✅ Successfully deleted ${result.deletedCount} phantom tickets`);
      console.log(`📊 Total found: ${result.totalFound}`);
    } else {
      console.log('❌ Cleanup failed:', cleanupResult);
      
      // If mutation doesn't exist, provide manual instructions
      if (cleanupResult.errorMessage && cleanupResult.errorMessage.includes('not found')) {
        console.log('');
        console.log('⚠️  The cleanup mutation may not be deployed yet.');
        console.log('');
        console.log('MANUAL CLEANUP INSTRUCTIONS:');
        console.log('1. Deploy the updated Convex functions first:');
        console.log('   npx convex deploy');
        console.log('');
        console.log('2. Then call the cleanup mutation via Convex dashboard:');
        console.log('   Function: tickets:cleanupTestTickets');
        console.log('   Args: {}');
        console.log('');
        console.log('3. Or use Convex CLI:');
        console.log('   npx convex run tickets:cleanupTestTickets');
      }
    }
  } catch (error) {
    console.error('❌ Error calling cleanup mutation:', error.message);
    console.log('');
    console.log('FALLBACK: Manual Database Cleanup Required');
    console.log('==========================================');
    console.log('');
    console.log('Since automatic cleanup failed, you need to manually remove these tickets:');
    console.log('');
    console.log('Ticket IDs to delete:');
    console.log('- j57ef34e3wf06rp56bgnbmky297j50k2 (test)');
    console.log('- j570qg1z5xhm63r4838b2anfnd7j51w9 (test_ref_*)');
    console.log('- j575hewf9km6vr26bsvwewqch17j6f36 (test_protection_check)');
    console.log('- Plus any other tickets with "test" references');
    console.log('');
    console.log('Use Convex dashboard or CLI to delete these tickets manually.');
  }

  // Step 2: Verify cleanup
  console.log('\n📊 Step 2: Verifying cleanup');
  console.log('-'.repeat(40));
  
  try {
    // Check if tickets still exist
    const verifyResponse = await fetch(`${CONVEX_URL}/api/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: 'tickets:getEventTickets',
        args: { eventId: 'jh716mjrw1nd9cven9w80k760s7j4a9j' }
      })
    });
    
    const verifyResult = await verifyResponse.json();
    const tickets = verifyResult.status === 'success' ? verifyResult.value : verifyResult;
    
    if (tickets && Array.isArray(tickets)) {
      const testTickets = tickets.filter(ticket => 
        !ticket.paystackReference || 
        ticket.paystackReference === 'test' ||
        ticket.paystackReference.includes('test_ref_') ||
        ticket.paystackReference.includes('test_protection_check')
      );
      
      if (testTickets.length === 0) {
        console.log('✅ SUCCESS: All phantom tickets have been removed!');
      } else {
        console.log(`❌ ${testTickets.length} phantom tickets still remain:`);
        testTickets.forEach((ticket, index) => {
          console.log(`   ${index + 1}. ID: ${ticket._id} | Ref: ${ticket.paystackReference}`);
        });
      }
      
      const validTickets = tickets.length - testTickets.length;
      console.log(`📊 Valid tickets remaining: ${validTickets}`);
    } else {
      console.log('⚠️  Could not verify cleanup - API response:', tickets);
    }
  } catch (error) {
    console.error('❌ Error verifying cleanup:', error.message);
  }

  // Step 3: Final recommendations
  console.log('\n📋 Step 3: Final Recommendations');
  console.log('-'.repeat(40));
  console.log('');
  console.log('After cleanup, make sure to:');
  console.log('1. ✅ Deploy updated Convex functions with filtering');
  console.log('2. ✅ Test event viewing (should show no phantom tickets)');
  console.log('3. ✅ Test actual ticket purchase flow');
  console.log('4. ✅ Verify createTestTicket is disabled');
  console.log('5. ✅ Monitor for any new phantom tickets');
  console.log('');
  console.log('🎉 Once cleanup is complete, the phantom tickets bug will be fixed!');
}

// Run the manual cleanup
if (import.meta.url === `file://${process.argv[1]}`) {
  manualCleanupPhantomTickets().catch(console.error);
}

export { manualCleanupPhantomTickets }; 