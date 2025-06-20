import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const useStorageUrls = (storageIds: Id<"_storage">[] | undefined) => {
  const urls = useQuery(
    api.files.getStorageUrls,
    storageIds && storageIds.length > 0 ? { storageIds } : "skip"
  );

  return { urls, isLoading: urls === undefined };
}; 