#!/usr/bin/env node

import { ConvexHttpClient } from "convex/browser";

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL;
if (!CONVEX_URL) {
  console.error("❌ CONVEX_URL not found in environment variables");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);
const USER_ID = "user_2vJuNcmCzrI01IdyvecSUR8CwlG"; // From the debug logs

async function debugTickets() {
  try {
    console.log("🔍 Debug: Checking tickets for user:", USER_ID);
    
    // Get all tickets for the user directly
    console.log("\n1. Getting tickets via getUserTickets query...");
    const userTickets = await convex.query("events:getUserTickets", { userId: USER_ID });
    console.log(`✅ getUserTickets returned ${userTickets.length} tickets`);
    
    if (userTickets.length > 0) {
      console.log("📋 Ticket details:");
      userTickets.forEach((ticket, index) => {
        console.log(`  ${index + 1}. ID: ${ticket._id}`);
        console.log(`     Status: ${ticket.status}`);
        console.log(`     PayStack Ref: ${ticket.paystackReference || 'N/A'}`);
        console.log(`     Event: ${ticket.event?.name || 'Unknown'}`);
        console.log(`     Created: ${new Date(ticket._creationTime).toLocaleString()}`);
        console.log("");
      });
    } else {
      console.log("❌ No tickets found via getUserTickets");
      
      // Try to get raw tickets directly (if such query exists)
      console.log("\n2. Checking if tickets exist in database at all...");
      try {
        // This might not work if the query doesn't exist, but worth trying
        const allEvents = await convex.query("events:get", {});
        console.log(`📊 Found ${allEvents.length} total events in database`);
        
        // Check waiting list for user
        console.log("\n3. Checking waiting list...");
        const waitingList = await convex.query("events:getUserWaitingList", { userId: USER_ID });
        console.log(`📋 Found ${waitingList.length} waiting list entries`);
        
        if (waitingList.length > 0) {
          console.log("🎫 Waiting list entries:");
          waitingList.forEach((entry, index) => {
            console.log(`  ${index + 1}. Status: ${entry.status}`);
            console.log(`     Event: ${entry.event?.name || 'Unknown'}`);
            console.log(`     Created: ${new Date(entry._creationTime).toLocaleString()}`);
            console.log(`     Offer Expires: ${entry.offerExpiresAt ? new Date(entry.offerExpiresAt).toLocaleString() : 'N/A'}`);
            console.log("");
          });
        }
        
      } catch (error) {
        console.log("⚠️ Could not check additional data:", error.message);
      }
    }
    
    console.log("✅ Debug completed");
    
  } catch (error) {
    console.error("❌ Error during debug:", error);
    process.exit(1);
  }
}

debugTickets(); 