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
  args: { userId: v.string(), paystackSubaccountId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { paystackSubaccountId: args.paystackSubaccountId });
  },
});

export const updateUser = mutation({
  args: {
    userId: v.string(),
    name: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { userId, name, email }) => {
    // Check if user exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name,
        email,
      });
      return existingUser._id;
    }

    // Create new user
    const newUserId = await ctx.db.insert("users", {
      userId,
      name,
      email,
      paystackSubaccountId: undefined,
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
      // Initialize other fields as needed, onboardingComplete will be false by default
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
    paystackSubaccountId: v.optional(v.string()),
    onboardingComplete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runMutation(internal.users.getOrCreateUser);

    await ctx.db.patch(user._id, {
      name: args.name !== undefined ? args.name : user.name, // Keep existing name if not provided
      logoStorageId: args.logoStorageId,
      bannerStorageId: args.bannerStorageId,
      socialLinks: args.socialLinks,
      paystackSubaccountId: args.paystackSubaccountId,
      onboardingComplete: args.onboardingComplete === undefined ? user.onboardingComplete : args.onboardingComplete,
    });
  },
});
