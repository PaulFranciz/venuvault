import { query, mutation } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Create a new discount code
export const createDiscountCode = mutation({
  args: {
    eventId: v.id("events"),
    code: v.string(),
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
      code,
      createdBy,
      discountType,
      discountAmount,
      validFrom,
      validUntil,
      maxUses,
      ticketTypeIds,
    } = args;

    // Validate the code format
    if (!/^[A-Z0-9_-]{3,20}$/.test(code)) {
      throw new ConvexError(
        "Discount code must be 3-20 characters and contain only uppercase letters, numbers, underscores, and hyphens."
      );
    }

    // Check if code already exists for this event
    const existingCode = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (existingCode) {
      throw new ConvexError("Discount code already exists.");
    }

    // Validate discount amount
    if (discountType === "percentage" && (discountAmount < 1 || discountAmount > 100)) {
      throw new ConvexError("Percentage discount must be between 1 and 100.");
    }

    if (discountType === "fixed" && discountAmount <= 0) {
      throw new ConvexError("Fixed discount must be greater than 0.");
    }

    // Validate dates
    if (validFrom >= validUntil) {
      throw new ConvexError("Start date must be before end date.");
    }

    // Create the discount code
    const discountCodeId = await ctx.db.insert("discountCodes", {
      eventId,
      code,
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

    return discountCodeId;
  },
});

// Get all discount codes for an event
export const getDiscountCodes = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    return await ctx.db
      .query("discountCodes")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .collect();
  },
});

// Toggle a discount code's active status
export const toggleDiscountCode = mutation({
  args: {
    discountCodeId: v.id("discountCodes"),
    isActive: v.boolean(),
  },
  handler: async (ctx, { discountCodeId, isActive }) => {
    await ctx.db.patch(discountCodeId, { isActive });
    return discountCodeId;
  },
});

// Delete a discount code
export const deleteDiscountCode = mutation({
  args: {
    discountCodeId: v.id("discountCodes"),
  },
  handler: async (ctx, { discountCodeId }) => {
    await ctx.db.delete(discountCodeId);
    return discountCodeId;
  },
});

// Validate a discount code
export const validateDiscountCode = query({
  args: {
    eventId: v.id("events"),
    code: v.string(),
    ticketTypeId: v.optional(v.string()),
  },
  handler: async (ctx, { eventId, code, ticketTypeId }) => {
    const discountCode = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!discountCode) {
      return { valid: false, message: "Discount code not found." };
    }

    if (discountCode.eventId !== eventId) {
      return { valid: false, message: "Discount code not valid for this event." };
    }

    if (!discountCode.isActive) {
      return { valid: false, message: "Discount code is not active." };
    }

    const now = Date.now();
    if (now < discountCode.validFrom) {
      return { valid: false, message: "Discount code is not yet valid." };
    }

    if (now > discountCode.validUntil) {
      return { valid: false, message: "Discount code has expired." };
    }

    if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
      return { valid: false, message: "Discount code has reached maximum usage." };
    }

    // Check if code applies to the ticket type
    if (ticketTypeId && discountCode.ticketTypeIds && discountCode.ticketTypeIds.length > 0) {
      if (!discountCode.ticketTypeIds.includes(ticketTypeId)) {
        return {
          valid: false,
          message: "Discount code not applicable to selected ticket type.",
        };
      }
    }

    // Code is valid, return the details
    return {
      valid: true,
      discountType: discountCode.discountType,
      discountAmount: discountCode.discountAmount,
      message: `Discount applied: ${
        discountCode.discountType === "percentage"
          ? `${discountCode.discountAmount}% off`
          : `₦${discountCode.discountAmount} off`
      }`,
    };
  },
});

// Apply a discount code (increment usage count)
export const applyDiscountCode = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, { code }) => {
    const discountCode = await ctx.db
      .query("discountCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .first();

    if (!discountCode) {
      throw new ConvexError("Discount code not found.");
    }

    // Increment usage count
    await ctx.db.patch(discountCode._id, {
      currentUses: discountCode.currentUses + 1,
    });

    return true;
  },
}); 