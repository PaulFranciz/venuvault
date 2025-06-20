"use client";

import { Loader2 } from "lucide-react";

interface LoadingFallbackProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingFallback({ 
  text = "Loading...", 
  size = "md",
  className = "" 
}: LoadingFallbackProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6", 
    lg: "w-8 h-8"
  };

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className="flex items-center space-x-2">
        <Loader2 className={`animate-spin ${sizeClasses[size]}`} />
        <span className="text-gray-600">{text}</span>
      </div>
    </div>
  );
}

export function PageLoadingFallback({ text = "Loading page..." }: { text?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fcf9f4]">
      <LoadingFallback text={text} size="lg" />
    </div>
  );
}

// Consistent empty state component
export function EmptyState({ 
  title = "No items found", 
  description = "There are no items to display at this time.",
  className = ""
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={`text-center p-8 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </div>
  );
} 