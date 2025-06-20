"use client";

import Image from "next/image";
import { useStorageUrl } from "../hooks/useStorageUrl";
import { Id } from "@/convex/_generated/dataModel";

type SearchResult = {
  _id: string;
  name: string;
  location: string;
  eventDate: number;
  imageUrl?: string;
  imageStorageId?: Id<"_storage">;
  thumbnailImageStorageId?: Id<"_storage">;
};

export default function EventSearchThumbnail({ result }: { result: SearchResult }) {
  // Use Convex storage URL hook for image IDs
  const thumbnailUrl = useStorageUrl(
    result.thumbnailImageStorageId || result.imageStorageId as Id<"_storage">
  );
  
  // Determine the image source to use
  // Priority: 1. Direct imageUrl, 2. thumbnailImageStorageId, 3. imageStorageId, 4. Fallback to logo
  const imageSource = result.imageUrl || thumbnailUrl || "/images/Ticwaka logo.svg";
  
  return (
    <div className="relative h-16 w-16 rounded-md overflow-hidden flex-shrink-0 bg-gray-100">
      <Image
        src={imageSource}
        alt={result.name}
        fill
        sizes="64px"
        className="object-cover"
        onError={(e) => {
          // Fallback if image fails to load
          (e.target as HTMLImageElement).src = "/images/Ticwaka logo.svg";
        }}
      />
    </div>
  );
}
