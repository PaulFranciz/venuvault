"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketCheck, Loader2 } from "lucide-react";

interface DiscountCodeInputProps {
  eventId: string;
  onDiscountApplied: (discount: {
    code: string;
    discountType: "percentage" | "fixed";
    discountAmount: number;
    ticketTypeIds?: string[];
  }) => void;
}

export default function DiscountCodeInput({ 
  eventId, 
  onDiscountApplied 
}: DiscountCodeInputProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const validateDiscountCode = async () => {
    if (!code.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      const response = await fetch(`/api/validate-discount?code=${encodeURIComponent(code)}&eventId=${eventId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Failed to validate discount code");
      }
      
      if (data.isValid) {
        setSuccess(`${data.discountType === "percentage" ? data.discountAmount + "%" : "₦" + data.discountAmount} discount applied!`);
        onDiscountApplied({
          code: data.code,
          discountType: data.discountType,
          discountAmount: data.discountAmount,
          ticketTypeIds: data.ticketTypeIds
        });
      } else {
        setError(data.message || "Invalid discount code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to validate code");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center">
        <Input
          placeholder="Enter discount code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="rounded-r-none"
          disabled={isLoading}
        />
        <Button 
          onClick={validateDiscountCode}
          disabled={!code.trim() || isLoading}
          className="rounded-l-none"
          variant="secondary"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Apply"
          )}
        </Button>
      </div>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      {success && (
        <div className="flex items-center gap-1 text-sm text-green-600">
          <TicketCheck className="h-4 w-4" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
} 