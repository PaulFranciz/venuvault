import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export const useStorageUrls = (storageIds: Id<"_storage">[] | undefined) => {
  const { data: urls, isLoading } = useQuery(
    api.files.getStorageUrls,
    storageIds ? { storageIds } : "skip"
  );

  return { urls, isLoading };
}; 