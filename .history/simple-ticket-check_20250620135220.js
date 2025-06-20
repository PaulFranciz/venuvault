#!/usr/bin/env node

const { ConvexHttpClient } = require("convex/browser");
require('dotenv').config({ path: '.env.local' });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found. Found:", process.env.NEXT_PUBLIC_CONVEX_URL);
  process.exit(1);
}

console.log("🔗 Using CONVEX_URL:", CONVEX_URL);

const convex = new ConvexHttpClient(CONVEX_URL);

const USER_ID = "user_2x3676Wr2uaeDul4fILUGvsOAOV";
const PAYMENT_REFERENCE = "32tx1ak6e8";

async function simpleTicketCheck() {
  console.log("🔍 SIMPLE TICKET DATABASE CHECK");
  console.log("===============================\n");
  
  try {
    // 1. Test basic getUserTickets query
    console.log("1. Testing getUserTickets query...");
    const userTickets = await convex.query("events:getUserTickets", { userId: USER_ID });
    console.log(`   Result: ${userTickets?.length || 0} tickets`);
    
    if (userTickets && userTickets.length > 0) {
      console.log("   Tickets found:");
      userTickets.forEach((ticket, index) => {
        console.log(`   ${index + 1}. Event: ${ticket.eventTitle || 'Unknown'}`);
        console.log(`      Status: ${ticket.status}`);
        console.log(`      Reference: ${ticket.paystackReference || 'None'}`);
      });
    }
    
    // 2. Try a simple user query to ensure DB connection works
    console.log("\n2. Testing user lookup...");
    const user = await convex.query("users:getUserById", { userId: USER_ID });
    console.log(`   User found: ${user ? '✅' : '❌'}`);
    if (user) {
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.name}`);
    }
    
    // 3. Check total tickets in database
    console.log("\n3. Checking total tickets in database...");
    try {
      const totalTickets = await convex.query("events:countAllTickets");
      console.log(`   Total tickets in database: ${totalTickets || 0}`);
    } catch (error) {
      console.log(`   Error counting tickets: ${error.message}`);
    }
    
    // 4. Check PayStack reference
    console.log("\n4. Payment reference analysis:");
    console.log(`   Reference: ${PAYMENT_REFERENCE}`);
    console.log(`   Length: ${PAYMENT_REFERENCE.length} characters`);
    console.log(`   Contains test patterns: ${PAYMENT_REFERENCE.includes('test') ? '❌ Yes' : '✅ No'}`);
    
    // 5. Diagnosis
    console.log("\n5. 🎯 DIAGNOSIS:");
    if (!userTickets || userTickets.length === 0) {
      console.log("   ❌ ISSUE FOUND: No tickets for user");
      console.log("   📋 Most likely causes:");
      console.log("      1. Webhook failed to create ticket");
      console.log("      2. Payment not completed");
      console.log("      3. Ticket created with wrong user ID");
      console.log("      4. Database transaction failed");
      
      console.log("\n   🔧 NEXT STEPS:");
      console.log("      1. Check PayStack dashboard for payment status");
      console.log("      2. Check webhook logs");
      console.log("      3. Manually trigger ticket creation if payment was successful");
    } else {
      console.log("   ✅ Tickets found - issue might be in frontend display");
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

console.log("🚀 Starting simple ticket check...\n");
simpleTicketCheck().then(() => {
  console.log("\n✅ Check complete!");
}).catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
}); 