#!/usr/bin/env node

const { ConvexHttpClient } = require("convex/browser");
require('dotenv').config({ path: '.env.local' });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = new ConvexHttpClient(CONVEX_URL);

const USER_ID = "user_2x3676Wr2uaeDul4fILUGvsOAOV";
const PAYMENT_REFERENCE = "32tx1ak6e8";

async function testTicketCreation() {
  console.log("🧪 TESTING MANUAL TICKET CREATION");
  console.log("==================================\n");
  
  try {
    // 1. First, get list of events to find a valid event ID
    console.log("1. Finding available events...");
    const events = await convex.query("events:get");
    console.log(`   Found ${events.length} events`);
    
    if (events.length === 0) {
      console.log("❌ No events found. Cannot create test ticket.");
      return;
    }
    
    // Use the first event
    const testEvent = events[0];
    console.log(`   Using event: ${testEvent.name} (ID: ${testEvent._id})`);
    
    // 2. Check current ticket count before creation
    console.log("\n2. Checking current tickets for user...");
    const beforeTickets = await convex.query("events:getUserTickets", { userId: USER_ID });
    console.log(`   Current tickets: ${beforeTickets.length}`);
    
    // 3. Create a test ticket
    console.log("\n3. Creating test ticket...");
    const ticketId = await convex.mutation("events:createTestTicket", {
      userId: USER_ID,
      eventId: testEvent._id,
      paystackReference: PAYMENT_REFERENCE,
      amount: 5000
    });
    console.log(`   ✅ Test ticket created: ${ticketId}`);
    
    // 4. Check if ticket appears in getUserTickets
    console.log("\n4. Verifying ticket appears in getUserTickets...");
    const afterTickets = await convex.query("events:getUserTickets", { userId: USER_ID });
    console.log(`   Tickets after creation: ${afterTickets.length}`);
    
    if (afterTickets.length > beforeTickets.length) {
      console.log("   ✅ SUCCESS: Ticket appears in getUserTickets!");
      console.log("   📋 This means the ticket creation and filtering logic works correctly.");
      console.log("   🎯 CONCLUSION: The webhook likely failed to create the original ticket.");
    } else {
      console.log("   ❌ ISSUE: Ticket created but doesn't appear in getUserTickets");
      console.log("   📋 This indicates a problem with the getUserTickets filtering logic.");
    }
    
    // 5. Show ticket details
    if (afterTickets.length > 0) {
      console.log("\n5. Ticket details:");
      afterTickets.forEach((ticket, index) => {
        console.log(`   Ticket ${index + 1}:`);
        console.log(`     - Event: ${ticket.eventTitle || 'Unknown'}`);
        console.log(`     - Status: ${ticket.status}`);
        console.log(`     - Reference: ${ticket.paystackReference}`);
        console.log(`     - Amount: ${ticket.amount || 0}`);
      });
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error("Stack:", error.stack);
  }
}

console.log("🚀 Starting ticket creation test...\n");
testTicketCreation().then(() => {
  console.log("\n✅ Test complete!");
}).catch(error => {
  console.error("❌ Fatal error:", error);
}); 