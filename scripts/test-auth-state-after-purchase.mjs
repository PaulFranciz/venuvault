#!/usr/bin/env node

/**
 * Script to test authentication state persistence after ticket purchase
 * This helps diagnose why auth state disappears after Paystack redirects
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-production-url.vercel.app' 
  : 'http://localhost:3001';

// Test user and event IDs - replace with actual values for testing
const TEST_USER_ID = 'user_2vKoofdZBctaJR92G35he8R4P9F';
const TEST_EVENT_ID = 'jh75jg13a0n5sywbb35zscs1bs7j7fcg';

console.log('🔍 Testing Authentication State After Purchase');
console.log('='.repeat(50));

async function testAuthenticationFlow() {
  console.log('\n1️⃣ Testing user authentication state...');
  
  try {
    // Test if we can get user tickets (requires auth)
    const ticketsResponse = await fetch(`${BASE_URL}/api/users/${TEST_USER_ID}/tickets?eventId=${TEST_EVENT_ID}`);
    console.log(`📝 Tickets API Response Status: ${ticketsResponse.status}`);
    
    if (ticketsResponse.ok) {
      const tickets = await ticketsResponse.json();
      console.log(`✅ User has ${tickets.length || 0} tickets`);
      if (tickets.length > 0) {
        console.log(`🎫 Latest ticket: ${tickets[0]._id} - Status: ${tickets[0].status}`);
      }
    } else {
      const error = await ticketsResponse.text();
      console.log(`❌ Tickets API Error: ${error}`);
    }
  } catch (error) {
    console.error('❌ Error testing tickets API:', error.message);
  }
}

async function testPaymentSuccessFlow() {
  console.log('\n2️⃣ Testing payment success page flow...');
  
  try {
    // Simulate the flow after payment success
    const successPageResponse = await fetch(`${BASE_URL}/payment/success?reference=test_${Date.now()}`);
    console.log(`💳 Payment Success Page Status: ${successPageResponse.status}`);
    
    if (successPageResponse.ok) {
      console.log('✅ Payment success page accessible');
    } else {
      console.log('❌ Payment success page error');
    }
  } catch (error) {
    console.error('❌ Error testing payment success page:', error.message);
  }
}

async function testTicketsPage() {
  console.log('\n3️⃣ Testing tickets page accessibility...');
  
  try {
    const ticketsPageResponse = await fetch(`${BASE_URL}/tickets`);
    console.log(`🎫 Tickets Page Status: ${ticketsPageResponse.status}`);
    
    if (ticketsPageResponse.ok) {
      console.log('✅ Tickets page accessible');
      
      // Check if page content suggests authentication issues
      const pageContent = await ticketsPageResponse.text();
      if (pageContent.includes('Sign in required')) {
        console.log('⚠️  Tickets page shows "Sign in required" - auth state issue detected');
      } else if (pageContent.includes('My Tickets')) {
        console.log('✅ Tickets page shows authenticated content');
      }
    } else {
      console.log('❌ Tickets page error');
    }
  } catch (error) {
    console.error('❌ Error testing tickets page:', error.message);
  }
}

async function testMiddlewareAuth() {
  console.log('\n4️⃣ Testing middleware authentication...');
  
  try {
    // Test accessing a protected route that should require auth
    const protectedResponse = await fetch(`${BASE_URL}/seller`);
    console.log(`🔒 Protected Route (/seller) Status: ${protectedResponse.status}`);
    
    if (protectedResponse.status === 302 || protectedResponse.status === 307) {
      console.log('✅ Middleware correctly redirecting unauthenticated requests');
    } else if (protectedResponse.status === 200) {
      console.log('⚠️  Protected route accessible without auth - potential issue');
    } else {
      console.log(`❌ Unexpected response from protected route: ${protectedResponse.status}`);
    }
  } catch (error) {
    console.error('❌ Error testing middleware auth:', error.message);
  }
}

async function checkConvexConnection() {
  console.log('\n5️⃣ Testing Convex connection and user sync...');
  
  try {
    // Test a simple query to check Convex connectivity
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    
    if (healthResponse) {
      console.log(`🔗 Health check status: ${healthResponse.status}`);
    }
    
    console.log('💡 Note: Convex auth integration uses Clerk tokens - check browser for proper token storage');
  } catch (error) {
    console.error('❌ Error testing Convex connection:', error.message);
  }
}

function printDiagnosticTips() {
  console.log('\n🔧 DIAGNOSTIC TIPS');
  console.log('='.repeat(30));
  console.log('');
  console.log('If authentication state disappears after purchase:');
  console.log('');
  console.log('1️⃣ CLERK SESSION ISSUES:');
  console.log('   • Check if Clerk session cookies are being preserved');
  console.log('   • Verify Paystack redirect doesn\'t clear session storage');
  console.log('   • Look for "clerk-js" tokens in browser localStorage');
  console.log('');
  console.log('2️⃣ CONVEX SYNC ISSUES:');
  console.log('   • SyncUserWithConvex runs on every render');
  console.log('   • Check if user sync is failing after redirect');
  console.log('   • Look for Convex auth errors in browser console');
  console.log('');
  console.log('3️⃣ REDIRECT CHAIN ISSUES:');
  console.log('   • Paystack → /payment/success → /tickets');
  console.log('   • Each redirect might cause auth state revalidation');
  console.log('   • Check if middleware is interfering');
  console.log('');
  console.log('4️⃣ TIMING ISSUES:');
  console.log('   • Auth state might take time to rehydrate after redirect');
  console.log('   • Add loading states to prevent premature "not authenticated" displays');
  console.log('');
  console.log('5️⃣ BROWSER SPECIFIC:');
  console.log('   • Safari/Firefox stricter cookie policies');
  console.log('   • Third-party cookie blocking affecting Clerk');
  console.log('   • Incognito mode clearing sessions');
}

function printSolutionSteps() {
  console.log('\n🚀 IMMEDIATE SOLUTIONS TO TRY');
  console.log('='.repeat(35));
  console.log('');
  console.log('1. Add authentication rehydration delay:');
  console.log('   • Add 2-3 second loading state on /tickets page');
  console.log('   • Wait for Clerk auth to fully rehydrate');
  console.log('');
  console.log('2. Improve error handling in tickets page:');
  console.log('   • Don\'t immediately show "not authenticated"');
  console.log('   • Show loading spinner while auth state resolves');
  console.log('');
  console.log('3. Add authentication persistence check:');
  console.log('   • Store temp flag in localStorage during checkout');
  console.log('   • Check flag on tickets page to detect fresh purchases');
  console.log('');
  console.log('4. Add manual auth refresh trigger:');
  console.log('   • Force Clerk to refresh session after Paystack redirect');
  console.log('   • Call user.reload() or equivalent after payment success');
}

// Run all tests
async function runDiagnostics() {
  await testAuthenticationFlow();
  await testPaymentSuccessFlow();
  await testTicketsPage();
  await testMiddlewareAuth();
  await checkConvexConnection();
  
  printDiagnosticTips();
  printSolutionSteps();
  
  console.log('\n✅ Diagnostics complete!');
  console.log('');
  console.log('🔍 Next steps:');
  console.log('1. Run this script before and after making a test purchase');
  console.log('2. Check browser dev tools for Clerk auth tokens');
  console.log('3. Monitor network requests during the payment flow');
  console.log('4. Test in different browsers and incognito mode');
}

runDiagnostics().catch(console.error); 