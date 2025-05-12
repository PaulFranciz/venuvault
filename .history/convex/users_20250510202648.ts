import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";

export const getUsersPaystackSubaccountId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .filter((q) => q.neq(q.field("paystackSubaccountId"), undefined))
      .first();
    return user?.paystackSubaccountId;
  },
});

export const updateOrCreateUserPaystackSubaccountId = mutation({
  args: { 
    userId: v.string(), // This should be the Clerk User ID
    paystackSubaccountId: v.string() 
  },
  handler: async (ctx, args) => {
    // It's generally safer for mutations that modify a specific user's data 
    // to rely on ctx.auth if they are callable from the client or actions that can get a token.
    // If this mutation is ONLY called by your server action which already authenticated the user,
    // then querying by args.userId (Clerk ID) is acceptable, provided you have an index on it.
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique(); // Use unique() if by_user_id guarantees uniqueness

    if (!user) {
      // This should ideally not happen if the user exists from a previous step (profile info)
      // Or if your server action ensures user creation first.
      console.error(`User not found for Clerk ID: ${args.userId} when trying to link Paystack.`);
      throw new Error("User not found. Cannot link Paystack account.");
    }

    const updates: Partial<typeof user> = {
      paystackSubaccountId: args.paystackSubaccountId,
      isPaystackSetupComplete: true,
    };

    // Check if profile info is complete to determine overall onboarding status
    if (user.isProfileInfoComplete === true) {
      updates.onboardingComplete = true; // Mark as fully onboarded
      console.log(`User ${user._id} is now fully onboarded. Profile complete, Paystack complete.`);
    } else {
      // If profile info is not complete, they are not fully onboarded yet,
      // even if Paystack is now setup.
      updates.onboardingComplete = false; 
      console.log(`User ${user._id} completed Paystack setup, but profile info is still pending. Not fully onboarded.`);
    }

    await ctx.db.patch(user._id, updates);
    console.log(`Patched user ${user._id} for Paystack setup. Paystack Complete: true, Fully Onboarded: ${updates.onboardingComplete}`);
  },
});

export const updateUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { userId, name, email }) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name,
        email,
      });
      return existingUser._id;
    }

    const newUserId = await ctx.db.insert("users", {
      userId,
      name,
      email,
      paystackSubaccountId: undefined,
      isProfileInfoComplete: false,
      isPaystackSetupComplete: false,
      onboardingComplete: false, 
    });

    return newUserId;
  },
});

export const getUserById = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    return user;
  },
});

// Helper to get user by Clerk ID, creating if not exists
export const getOrCreateUser = internalMutation(
  async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("User not authenticated.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
      .unique();

    if (user) {
      return user;
    }

    // If user not found, create a new one
    const newUserId = await ctx.db.insert("users", {
      userId: identity.subject,
      email: identity.email!,
      name: identity.name || identity.nickname || "New User", // Use Clerk name/nickname if available
      isProfileInfoComplete: false,
      isPaystackSetupComplete: false,
      onboardingComplete: false,
    });
    
    const newUserDoc = await ctx.db.get(newUserId);
    if (!newUserDoc) { // Should not happen
        throw new ConvexError("Failed to retrieve newly created user.");
    }
    return newUserDoc;
  }
);

// Get user profile (callable from client)
export const getUserProfile = query(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null; // Or throw error, depending on how you want to handle unauthenticated access
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_user_id", (q) => q.eq("userId", identity.subject))
    .unique();

  return user;
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const updateUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    logoStorageId: v.optional(v.id("_storage")),
    bannerStorageId: v.optional(v.id("_storage")),
    socialLinks: v.optional(v.object({
      instagram: v.optional(v.string()),
      twitter: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runMutation(internal.users.getOrCreateUser);

    await ctx.db.patch(user._id, {
      name: args.name !== undefined ? args.name : user.name, // Keep existing name if not provided
      logoStorageId: args.logoStorageId,
      bannerStorageId: args.bannerStorageId,
      socialLinks: args.socialLinks,
      isProfileInfoComplete: true,
    });
    console.log(`Profile info updated for user ${user._id}. isProfileInfoComplete set to true.`);
  },
});
