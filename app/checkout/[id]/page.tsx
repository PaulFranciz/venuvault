"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { initializePaystackTransaction } from "@/app/actions/initializePaystackTransaction";
import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Ticket, 
  CreditCard, 
  Info, 
  Plus, 
  Trash2, 
  BadgePercent,
  Loader2
} from "lucide-react";
import Link from "next/link";
import DiscountCodeInput from "@/components/checkout/DiscountCodeInput";

interface TicketRecipient {
  name: string;
  email: string;
}

interface DiscountInfo {
  code: string;
  discountType: "percentage" | "fixed";
  discountAmount: number;
  ticketTypeIds?: string[];
}

export default function CheckoutPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  
  const event = useQuery(api.events.getById, { 
    eventId: id as Id<"events"> 
  });
  
  const queuePosition = useQuery(api.waitingList.getQueuePosition, {
    eventId: id as Id<"events">,
    userId: user?.id ?? "",
  });
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);
  const [recipients, setRecipients] = useState<TicketRecipient[]>([]);
  const [sendToOthers, setSendToOthers] = useState(false);
  const [discount, setDiscount] = useState<DiscountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Calculate ticket details
  const ticketTypeId = queuePosition?.ticketTypeId;
  const quantity = queuePosition?.quantity || 1;
  
  let ticketPrice = event?.price || 0;
  let ticketName = "General Admission";
  
  if (ticketTypeId && event?.ticketTypes) {
    const selectedType = event.ticketTypes.find(type => type.id === ticketTypeId);
    if (selectedType) {
      ticketPrice = selectedType.price;
      ticketName = selectedType.name;
    }
  }
  
  // Check if event is free
  const isFreeEvent = ticketPrice === 0;
  
  // Calculate discount
  const calculateDiscount = (price: number) => {
    if (!discount) return 0;
    
    // Check if discount applies to this ticket type
    if (discount.ticketTypeIds && discount.ticketTypeIds.length > 0) {
      if (!ticketTypeId || !discount.ticketTypeIds.includes(ticketTypeId)) {
        return 0;
      }
    }
    
    if (discount.discountType === "percentage") {
      return price * (discount.discountAmount / 100);
    } else {
      return Math.min(price, discount.discountAmount); // Don't discount more than the ticket price
    }
  };
  
  const discountAmount = calculateDiscount(ticketPrice) * quantity;
  
  // Calculate total
  const subtotal = ticketPrice * quantity;
  const total = subtotal - discountAmount;
  
  // Initialize with user data when available
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setFullName(user.fullName || "");
      setEmail(user.primaryEmailAddress?.emailAddress || "");
      
      // Initialize the first recipient with the user's info
      if (quantity > 1 && recipients.length === 0) {
        const initialRecipients: TicketRecipient[] = [{
          name: user.fullName || "",
          email: user.primaryEmailAddress?.emailAddress || ""
        }];
        
        // Add empty slots for additional recipients
        for (let i = 1; i < quantity; i++) {
          initialRecipients.push({ name: "", email: "" });
        }
        
        setRecipients(initialRecipients);
      }
    }
  }, [isLoaded, isSignedIn, user, quantity, recipients.length]);
  
  const handleAddRecipient = () => {
    if (recipients.length < quantity) {
      setRecipients([...recipients, { name: "", email: "" }]);
    }
  };
  
  const handleRemoveRecipient = (index: number) => {
    const newRecipients = [...recipients];
    newRecipients.splice(index, 1);
    setRecipients(newRecipients);
  };
  
  const handleRecipientChange = (index: number, field: keyof TicketRecipient, value: string) => {
    const newRecipients = [...recipients];
    newRecipients[index] = { ...newRecipients[index], [field]: value };
    setRecipients(newRecipients);
  };
  
  const handleDiscountApplied = (discountInfo: DiscountInfo) => {
    setDiscount(discountInfo);
  };
  
  const handleSubmit = async () => {
    if (!isAgreedToTerms) {
      setError("You must agree to the terms and conditions");
      return;
    }
    
    if (!fullName || !email) {
      setError("Please fill in all required fields");
      return;
    }
    
    // Validate recipients if sending to others
    if (sendToOthers && recipients.length > 0) {
      const isValid = recipients.every(r => r.name.trim() && r.email.trim());
      if (!isValid) {
        setError("Please fill in all recipient information");
        return;
      }
    }
    
    setError(null);
    setIsLoading(true);
    
    try {
      // For free tickets, we would implement a different flow
      if (isFreeEvent) {
        // TODO: Implement free ticket reservation
        // For now, just redirect to success page
        router.push("/tickets?success=true");
        return;
      }
      
      // For paid tickets, initialize Paystack
      const result = await initializePaystackTransaction({
        eventId: id as Id<"events">,
        ticketTypeId,
        quantity,
        discountCode: discount?.code,
        customerInfo: {
          name: fullName,
          email,
          phone: phoneNumber,
        },
        recipients: sendToOthers ? recipients : undefined
      });
      
      if (result?.authorizationUrl) {
        window.location.href = result.authorizationUrl;
      } else {
        throw new Error("Failed to initialize payment");
      }
    } catch (err) {
      console.error("Payment initialization error:", err);
      setError(err instanceof Error ? err.message : "Could not process payment. Please try again.");
      setIsLoading(false);
    }
  };
  
  if (!event || !isLoaded || !queuePosition) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }
  
  // Verify if user has a valid offer
  if (queuePosition?.status !== "offered") {
    router.push(`/event/${id}`);
    return null;
  }
  
  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6">
          <Link 
            href={`/event/${id}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Back to Event</span>
          </Link>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Checkout
        </h1>
        <p className="text-gray-600 mb-8">
          Complete your purchase for {event.name}
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column - Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* Purchaser Information */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Your Information</h2>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
              </div>
            </div>
            
            {/* Ticket Recipients - only for multiple tickets */}
            {quantity > 1 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Ticket Recipients</h2>
                  
                  <div className="flex items-center">
                    <Checkbox
                      id="sendToOthers"
                      checked={sendToOthers}
                      onCheckedChange={(checked) => setSendToOthers(!!checked)}
                    />
                    <Label htmlFor="sendToOthers" className="ml-2">
                      Send tickets to different email addresses
                    </Label>
                  </div>
                </div>
                
                {sendToOthers && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Tickets will only be sent to the email addresses you provide here.
                    </p>
                    
                    {recipients.map((recipient, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-medium">Recipient {index + 1}</span>
                          
                          {index > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveRecipient(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`name-${index}`}>Name</Label>
                            <Input
                              id={`name-${index}`}
                              value={recipient.name}
                              onChange={(e) => handleRecipientChange(index, "name", e.target.value)}
                              required
                            />
                          </div>
                          
                          <div>
                            <Label htmlFor={`email-${index}`}>Email</Label>
                            <Input
                              id={`email-${index}`}
                              type="email"
                              value={recipient.email}
                              onChange={(e) => handleRecipientChange(index, "email", e.target.value)}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {recipients.length < quantity && (
                      <Button 
                        variant="outline" 
                        className="w-full mt-3"
                        onClick={handleAddRecipient}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Another Recipient
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Discount Code */}
            {!isFreeEvent && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <div className="flex items-center mb-4 gap-2">
                  <BadgePercent className="w-5 h-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Discount Code</h2>
                </div>
                
                <DiscountCodeInput 
                  eventId={id as string} 
                  onDiscountApplied={handleDiscountApplied} 
                />
              </div>
            )}
            
            {/* Terms and Conditions */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start space-x-3">
                <Checkbox 
                  id="terms" 
                  checked={isAgreedToTerms}
                  onCheckedChange={(checked) => setIsAgreedToTerms(!!checked)}
                />
                <Label htmlFor="terms" className="text-sm">
                  I agree to the <a href="#" className="text-blue-600 hover:underline">terms and conditions</a> and <a href="#" className="text-blue-600 hover:underline">privacy policy</a>. I understand that my tickets are non-refundable unless specified by the event organizer.
                </Label>
              </div>
            </div>
          </div>
          
          {/* Right column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-sm sticky top-6">
              <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                  <Ticket className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium">{ticketName}</p>
                    <p className="text-sm text-gray-600">
                      {quantity > 1 ? `${quantity} tickets` : "1 ticket"}
                    </p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="font-medium">₦{ticketPrice.toFixed(2)}</p>
                    {quantity > 1 && (
                      <p className="text-sm text-gray-600">
                        x{quantity}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Subtotal */}
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>₦{subtotal.toFixed(2)}</span>
                </div>
                
                {/* Discount */}
                {discount && discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount.code})</span>
                    <span>-₦{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                
                <Separator />
                
                {/* Total */}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₦{total.toFixed(2)}</span>
                </div>
                
                {/* Checkout Button */}
                <Button 
                  className="w-full py-6 text-base flex items-center justify-center gap-2 mt-4"
                  onClick={handleSubmit}
                  disabled={isLoading || !isAgreedToTerms}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      <span>{isFreeEvent ? "Complete Registration" : "Pay Now"}</span>
                    </>
                  )}
                </Button>
                
                {error && (
                  <p className="text-sm text-red-500 text-center mt-2">{error}</p>
                )}
                
                <p className="text-xs text-gray-500 text-center mt-3">
                  Your payment is secured with industry-standard encryption
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}