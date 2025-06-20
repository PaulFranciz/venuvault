#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found in environment variables");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

// User info from the screenshot
const USER_ID = "user_2x3676Wr2uaeDul4fILUGvsOAOV";
const PAYMENT_REFERENCE = "32tx1ak6e8";

async function comprehensiveTicketFlowTest() {
  console.log("🔍 COMPREHENSIVE TICKET FLOW DEBUGGING");
  console.log("=====================================\n");
  
  try {
    console.log("1. 🧪 TESTING USER AUTHENTICATION STATE");
    console.log("-".repeat(50));
    
    // Test user existence
    try {
      const user = await convex.query("users:getUserById", { userId: USER_ID });
      if (user) {
        console.log(`✅ User exists: ${user.email || user.name || 'Unknown'}`);
        console.log(`   - User ID: ${USER_ID}`);
        console.log(`   - Created: ${user._creationTime ? new Date(user._creationTime) : 'Unknown'}`);
      } else {
        console.log(`❌ User not found in database`);
      }
    } catch (error) {
      console.log(`❌ Error fetching user: ${error.message}`);
    }
    
    console.log("\n2. 🎫 TESTING DIRECT TICKET QUERIES");
    console.log("-".repeat(50));
    
    // Get all tickets for user (bypassing getUserTickets filtering)
    try {
      const allTickets = await convex.query("events:getAllTicketsForUser", { userId: USER_ID });
      console.log(`📊 Direct ticket query returned: ${allTickets?.length || 0} tickets`);
      
      if (allTickets && allTickets.length > 0) {
        allTickets.forEach((ticket, index) => {
          console.log(`   Ticket ${index + 1}:`);
          console.log(`     - ID: ${ticket._id}`);
          console.log(`     - Event ID: ${ticket.eventId}`);
          console.log(`     - Status: ${ticket.status}`);
          console.log(`     - PayStack Ref: ${ticket.paystackReference || 'None'}`);
          console.log(`     - Created: ${new Date(ticket._creationTime)}`);
          console.log(`     - Price: ${ticket.price || 0}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error with direct ticket query: ${error.message}`);
    }
    
    console.log("\n3. 🔍 TESTING SPECIFIC PAYMENT REFERENCE");
    console.log("-".repeat(50));
    
    // Search for tickets with the specific PayStack reference
    try {
      const ticketsByRef = await convex.query("events:getTicketsByPaystackReference", { 
        paystackReference: PAYMENT_REFERENCE 
      });
      console.log(`📊 Tickets with reference '${PAYMENT_REFERENCE}': ${ticketsByRef?.length || 0}`);
      
      if (ticketsByRef && ticketsByRef.length > 0) {
        ticketsByRef.forEach((ticket, index) => {
          console.log(`   Ticket ${index + 1}:`);
          console.log(`     - User ID: ${ticket.userId}`);
          console.log(`     - Status: ${ticket.status}`);
          console.log(`     - Event ID: ${ticket.eventId}`);
          console.log(`     - Matches our user: ${ticket.userId === USER_ID ? '✅' : '❌'}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error searching by PayStack reference: ${error.message}`);
    }
    
    console.log("\n4. 🧮 TESTING getUserTickets QUERY");
    console.log("-".repeat(50));
    
    // Test the actual getUserTickets query that's failing
    try {
      const userTickets = await convex.query("events:getUserTickets", { userId: USER_ID });
      console.log(`📊 getUserTickets returned: ${userTickets?.length || 0} tickets`);
      
      if (userTickets && userTickets.length > 0) {
        userTickets.forEach((ticket, index) => {
          console.log(`   Ticket ${index + 1}:`);
          console.log(`     - Event: ${ticket.eventTitle || 'Unknown'}`);
          console.log(`     - Status: ${ticket.status}`);
          console.log(`     - Reference: ${ticket.paystackReference || 'None'}`);
        });
      } else {
        console.log("❌ No tickets returned from getUserTickets - this is the issue!");
      }
    } catch (error) {
      console.log(`❌ Error with getUserTickets query: ${error.message}`);
    }
    
    console.log("\n5. 💳 TESTING RECENT PAYMENT PROCESSING");
    console.log("-".repeat(50));
    
    // Check if there are any orders/transactions being processed
    try {
      const recentOrders = await convex.query("orders:getOrdersByPaystackReference", { 
        paystackReference: PAYMENT_REFERENCE 
      });
      console.log(`📊 Orders with reference '${PAYMENT_REFERENCE}': ${recentOrders?.length || 0}`);
      
      if (recentOrders && recentOrders.length > 0) {
        recentOrders.forEach((order, index) => {
          console.log(`   Order ${index + 1}:`);
          console.log(`     - Status: ${order.status}`);
          console.log(`     - User ID: ${order.userId}`);
          console.log(`     - Amount: ${order.amount}`);
          console.log(`     - Created: ${new Date(order._creationTime)}`);
        });
      }
    } catch (error) {
      console.log(`❌ Error checking orders: ${error.message}`);
    }
    
    console.log("\n6. 📋 DEBUGGING FILTERING LOGIC");
    console.log("-".repeat(50));
    
    console.log(`🔍 Checking if reference '${PAYMENT_REFERENCE}' would be filtered out:`);
    
    // Test the filtering patterns we implemented
    const testReference = PAYMENT_REFERENCE;
    const wouldBeFiltered = 
      testReference === 'TEST_ONLY_REFERENCE' ||
      testReference.startsWith('INTERNAL_TEST_') ||
      testReference === 'DEBUG_TEST_TICKET';
    
    console.log(`   - Reference: '${testReference}'`);
    console.log(`   - Would be filtered: ${wouldBeFiltered ? '❌ YES' : '✅ NO'}`);
    console.log(`   - Pattern check:`);
    console.log(`     * TEST_ONLY_REFERENCE: ${testReference === 'TEST_ONLY_REFERENCE'}`);
    console.log(`     * INTERNAL_TEST_ prefix: ${testReference.startsWith('INTERNAL_TEST_')}`);
    console.log(`     * DEBUG_TEST_TICKET: ${testReference === 'DEBUG_TEST_TICKET'}`);
    
    console.log("\n7. 🌐 WEBHOOK PROCESSING STATUS");
    console.log("-".repeat(50));
    
    // Check webhook logs or processing status
    console.log("📋 Checking webhook processing status...");
    console.log("   - This would typically be checked via:");
    console.log("   - Database logs, webhook delivery status, or Paystack dashboard");
    console.log("   - Recent purchase detected suggests webhook fired but ticket creation may have failed");
    
    console.log("\n8. 🎯 RECOMMENDED NEXT STEPS");
    console.log("-".repeat(50));
    console.log("Based on the debugging results:");
    console.log("1. Check if webhook successfully created the ticket in the database");
    console.log("2. Verify the ticket has the correct user ID and status");
    console.log("3. Ensure filtering logic isn't excluding the ticket");
    console.log("4. Check for any database transaction failures");
    console.log("5. Verify event ID association is correct");
    
  } catch (error) {
    console.error("❌ Comprehensive test failed:", error.message);
    console.error(error.stack);
  }
}

// Add helper queries that might not exist
console.log("🚀 Starting comprehensive ticket flow debugging...\n");
comprehensiveTicketFlowTest().then(() => {
  console.log("\n✅ Debugging complete!");
  process.exit(0);
}).catch(error => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
}); 