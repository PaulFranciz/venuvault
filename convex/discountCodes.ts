import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { Id } from "./_generated/dataModel";

export const generateCode = mutation({
  args: {
    eventId: v.id("events"),
    createdBy: v.string(),
    discountType: v.union(v.literal("percentage"), v.literal("fixed")),
    discountAmount: v.number(),
    validFrom: v.number(),
    validUntil: v.number(),
    maxUses: v.optional(v.number()),
    ticketTypeIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const {
      eventId,
      createdBy,
      discountType,
      discountAmount,
      validFrom,
      validUntil,
      maxUses,
      ticketTypeIds,
    } = args;

    // Validate discount amount based on type
    if (discountType === "percentage" && (discountAmount <= 0 || discountAmount > 100)) {
      throw new ConvexError("Percentage discount must be between 0 and 100");
    }

    if (discountType === "fixed" && discountAmount < 0) {
      throw new ConvexError("Fixed discount amount cannot be negative");
    }

    // Validate date range
    if (validUntil <= validFrom) {
      throw new ConvexError("Valid until date must be after valid from date");
    }

    // Generate a unique code
    // Format: 8 characters, alphanumeric
    const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed similar-looking characters
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    // Create the discount code in database
    const discountCodeId = await ctx.db.insert("discountCodes", {
      code,
      eventId,
      createdBy,
      discountType,
      discountAmount,
      validFrom,
      validUntil,
      maxUses,
      currentUses: 0,
      ticketTypeIds,
      isActive: true,
    });

    return { discountCodeId, code };
  },
});

// Get discount codes for an event
export const getByEventId = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    return await ctx.db
      .query("discountCodes")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
  },
});

// Validate a discount code
export const validateCode = query({
  args: { 
    code: v.string(),
    eventId: v.string()
  },
  handler: async (ctx, { code, eventId }) => {
    // Normalize code (remove spaces, uppercase)
    const normalizedCode = code.trim().toUpperCase();
    
    // Find the discount code
    const discountCode = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();
    
    // If not found or not active
    if (!discountCode) {
      return {
        isValid: false,
        message: "Invalid discount code"
      };
    }
    
    // Check if it's for the right event
    if (discountCode.eventId !== eventId as Id<"events">) {
      return {
        isValid: false,
        message: "Discount code is not valid for this event"
      };
    }
    
    // Check if it's active
    if (!discountCode.isActive) {
      return {
        isValid: false,
        message: "Discount code is no longer active"
      };
    }
    
    const now = Date.now();
    
    // Check date validity
    if (now < discountCode.validFrom || now > discountCode.validUntil) {
      return {
        isValid: false,
        message: "Discount code is not valid at this time"
      };
    }
    
    // Check usage limits
    if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
      return {
        isValid: false,
        message: "Discount code has reached maximum uses"
      };
    }
    
    // Valid code, return discount details
    return {
      isValid: true,
      code: discountCode.code,
      discountType: discountCode.discountType,
      discountAmount: discountCode.discountAmount,
      ticketTypeIds: discountCode.ticketTypeIds
    };
  }
});

// Apply a discount code (increment usage counter)
export const applyCode = mutation({
  args: { 
    code: v.string(),
    eventId: v.id("events")
  },
  handler: async (ctx, { code, eventId }) => {
    // Normalize code
    const normalizedCode = code.trim().toUpperCase();
    
    // Find the discount code
    const discountCode = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", normalizedCode))
      .first();
    
    if (!discountCode) {
      throw new ConvexError("Invalid discount code");
    }
    
    // Directly validate the code without using ctx.runQuery
    // Reuse validation logic directly
    const normalized = code.trim().toUpperCase();
    const now = Date.now();

    // Basic validation
    if (!discountCode.isActive) {
      throw new ConvexError("Discount code is no longer active");
    }
    
    if (discountCode.eventId !== eventId) {
      throw new ConvexError("Discount code is not valid for this event");
    }
    
    if (now < discountCode.validFrom || now > discountCode.validUntil) {
      throw new ConvexError("Discount code is not valid at this time");
    }
    
    if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
      throw new ConvexError("Discount code has reached maximum uses");
    }
    
    // Increment usage counter
    await ctx.db.patch(discountCode._id, {
      currentUses: discountCode.currentUses + 1
    });
    
    return {
      success: true,
      code: discountCode.code,
      discountType: discountCode.discountType,
      discountAmount: discountCode.discountAmount
    };
  }
});