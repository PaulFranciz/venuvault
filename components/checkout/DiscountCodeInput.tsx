"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TicketCheck, Loader2, BadgePercent } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

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

  // Use Convex's validateCode query directly - using skip option to only run when needed
  const [validateCodeInput, setValidateCodeInput] = useState<string | null>(null);
  
  // Use Convex's validateCode query with skip option
  const result = useQuery(
    api.discountCodes.validateCode, 
    validateCodeInput ? { code: validateCodeInput, eventId } : "skip"
  );
  
  // Handle validation when result changes
  useEffect(() => {
    // Skip if we have no code to validate or if the query is still loading
    if (!validateCodeInput || result === undefined) return;
    
    if (result && 'isValid' in result) {
      setIsLoading(false);
      
      if (result.isValid && result.discountType && result.discountAmount !== undefined) {
        const discountType = result.discountType as "percentage" | "fixed";
        const discountText = discountType === "percentage" 
          ? `${result.discountAmount}%` 
          : `₦${result.discountAmount}`;
        
        setSuccess(`${discountText} discount applied!`);
        toast.success("Discount code applied!", {
          description: `Your ${discountText} discount has been applied to eligible items.`,
          icon: <BadgePercent className="h-4 w-4" />
        });
        
        onDiscountApplied({
          code: result.code || '',
          discountType: discountType,
          discountAmount: result.discountAmount,
          ticketTypeIds: result.ticketTypeIds
        });
      } else {
        setError(result.message || "Invalid discount code");
        toast.error("Invalid discount code", {
          description: result.message || "The discount code you entered is not valid."
        });
      }
      
      // Clear validation input to prevent reprocessing
      setValidateCodeInput(null);
    }
  }, [result, validateCodeInput, onDiscountApplied, eventId]);
  
  const validateDiscountCode = () => {
    if (!code.trim()) return;
    
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    
    // Set the validation input to trigger the query
    setValidateCodeInput(code.trim());
  }

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