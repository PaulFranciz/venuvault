import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// To store file metadata if needed, e.g., associating with a user or event
// export const createFileRecord = mutation({
//   args: {
//     storageId: v.id("_storage"),
//     userId: v.optional(v.id("users")), // Or whatever entity it's related to
//     fileName: v.string(),
//     fileType: v.string(),
//   },
//   handler: async (ctx, args) => {
//     await ctx.db.insert("fileMetadata", { // Assuming a "fileMetadata" table
//       storageId: args.storageId,
//       userId: args.userId,
//       fileName: args.fileName,
//       fileType: args.fileType,
//     });
//   },
// });

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const sendAudio = mutation({
  args: { storageId: v.id("_storage"), format: v.string() },
  handler: async (ctx, args) => {
    // Here you could add logic to process the audio file,
    // e.g., transcribing it, etc.
  },
});

export const sendVideo = mutation({
  args: { storageId: v.id("_storage"), format: v.string() },
  handler: async (ctx, args) => {
    // Similar to audio, you can process the video here
  },
});

export const sendImage = mutation({
  args: { storageId: v.id("_storage"), format: v.string() },
  handler: async (ctx, args) => {
    // Process image, e.g., resizing, etc.
  },
});

// If you want to get a file URL for display, you'd use:
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    if (!args.storageId) return null; // Handle case where storageId might be undefined/null
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const getStorageUrls = query({
  args: {
    storageIds: v.array(v.id("_storage")),
  },
  handler: async (ctx, { storageIds }) => {
    const urls = await Promise.all(
      storageIds.map((storageId) => ctx.storage.getUrl(storageId))
    );
    return urls.filter((url): url is string => url !== null);
  },
}); 