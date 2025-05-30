"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

/**
 * Hook to convert a Convex storage ID to a URL
 * 
 * @param storageId The Convex storage ID to get a URL for
 * @returns A URL that can be used to fetch the file
 */
export function useStorageUrl(storageId: Id<"_storage"> | null | undefined) {
  const url = useQuery(api.storage.getUrl, storageId ? { storageId } : "skip");
  return url;
}
