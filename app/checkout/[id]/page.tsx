"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
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
import { BadgePercent, CreditCard, Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import DiscountCodeInput from "@/components/checkout/DiscountCodeInput";
import Image from "next/image";
import { useStorageUrl } from "@/lib/utils";
import { dialCodes } from "@/lib/dialCodes";
import CountUp from "react-countup";
import { toast } from "sonner";

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

  const event = useQuery(api.events.getById, { eventId: id as Id<"events"> });

  // Enhanced type definition to accommodate extended queue position status values
  type QueueStatus = "waiting" | "offered" | "purchased" | "expired" | "released" | string;
  
  // Define more complete interface for queue position with ticketDetails
  interface QueuePositionWithDetails {
    position: number;
    _id: Id<"waitingList">;
    _creationTime: number;
    quantity?: number;
    ticketTypeId?: string;
    ticketDetails?: Array<{ ticketTypeId: string; quantity: number }>;
    offerExpiresAt?: number;
    userId: string;
    eventId: Id<"events">;
    status: QueueStatus;
  }
  
  const queuePosition = useQuery(api.waitingList.getQueuePosition, {
    eventId: id as Id<"events">,
    userId: user?.id ?? "",
  }) as QueuePositionWithDetails | null | undefined;

  // Always fetch event image URL to maintain consistent hook order
  const imageUrl = useStorageUrl(event?.thumbnailImageStorageId || event?.imageStorageId);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dialCode, setDialCode] = useState("+234"); // default Nigeria
  const [isAgreedToTerms, setIsAgreedToTerms] = useState(false);
  const [recipients, setRecipients] = useState<TicketRecipient[]>([]);
  const [sendToOthers, setSendToOthers] = useState(false);
  const [discount, setDiscount] = useState<DiscountInfo | null>(null);
  const [originalTotal, setOriginalTotal] = useState<number>(0);
  const [animatePrices, setAnimatePrices] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Track hydration state - crucial for Next.js 15's partial hydration
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Setup empty arrays for multiple tickets
  const [selectedTickets, setSelectedTickets] = useState<
    Array<{ id: string; name: string; price: number; quantity: number }>
  >([]);

  // Store URL params in ref to prevent recomputation on each render
  const searchParamsRef = useRef<{
    ticketTypes: string[];
    quantities: string[];
    isUsingUrlParams: boolean;
  }>({ ticketTypes: [], quantities: [], isUsingUrlParams: false });

  // Get URL search params and check sessionStorage backup during initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      // First get URL params
      const searchParams = new URLSearchParams(window.location.search);
      let ticketTypes = searchParams.getAll("ticketTypes[]");
      let quantities = searchParams.getAll("quantities[]");
      let hasValidParams = ticketTypes.length > 0 && quantities.length > 0;
      
      // Check for sessionStorage backup if URL params are invalid
      if (!hasValidParams) {
        try {
          const sessionData = sessionStorage.getItem('checkout-data');
          if (sessionData) {
            const checkoutData = JSON.parse(sessionData);
            console.log('Found checkout data in sessionStorage:', checkoutData);
            
            // Check data is valid and recent (within last 10 minutes)
            const isRecent = checkoutData.timestamp && 
                           (Date.now() - checkoutData.timestamp < 10 * 60 * 1000);
            
            if (isRecent && checkoutData.ticketType && checkoutData.quantity) {
              // Use session data instead
              console.log('Using sessionStorage backup for checkout data');
              ticketTypes = [checkoutData.ticketType];
              quantities = [String(checkoutData.quantity)];
              hasValidParams = true;
              
              // Restore reservation state from session if needed
              if (!useTicketStore.getState().hasActiveReservation()) {
                console.log('Restoring reservation state from session data');
                useTicketStore.getState().startReservation(
                  checkoutData.expiry || Date.now() + 600000,
                  checkoutData.reservationId,
                  checkoutData.eventId,
                  null, // eventName
                  null  // eventBannerUrl
                );
              }
            } else {
              // Clean up old data
              console.log('Session data is too old or invalid');
              sessionStorage.removeItem('checkout-data');
            }
          }
        } catch (e) {
          console.error('Error parsing sessionStorage data:', e);
        }
      }

      // Update search params ref with our potentially updated values
      searchParamsRef.current = {
        ticketTypes,
        quantities,
        isUsingUrlParams: hasValidParams,
      };
      
      console.log('Search params initialized:', searchParamsRef.current);
    }
  }, []);

  // Load ticket details either from URL or queuePosition
  useEffect(() => {
    // Critical hydration guard - prevents any state checks or redirects before hydration is complete
    if (!isHydrated) {
      return; // Wait for hydration to complete before any data processing
    }
    
    // Ensure essential data is loaded before making decisions.
    // event and event.ticketTypes must be present.
    // queuePosition can be null (no entry) or an object (entry exists). undefined means still loading.
    if (!event || !event.ticketTypes || queuePosition === undefined) {
      return; // Wait for essential data to load
    }

    const { ticketTypes, quantities, isUsingUrlParams } = searchParamsRef.current;

    // If selectedTickets is already populated correctly based on the current valid source, no need to re-process.
    if (selectedTickets.length > 0) {
      const urlSourceValidAndProcessed = isUsingUrlParams && ticketTypes.length > 0;
      const queueSourceValidAndProcessed = !isUsingUrlParams && queuePosition?.status === "offered";
      if (urlSourceValidAndProcessed || queueSourceValidAndProcessed) {
        return;
      }
    }

    if (isUsingUrlParams && ticketTypes.length > 0) {
      const ticketsFromUrl = ticketTypes
        .map((typeId, index) => {
          const quantity = parseInt(quantities[index] || "1", 10);
          const ticketType = event.ticketTypes?.find((t) => t.id === typeId);
          if (!ticketType) return null; // Invalid ticketType ID from URL
          return {
            id: typeId,
            name: ticketType.name,
            price: ticketType.price || 0,
            quantity: quantity,
          };
        })
        .filter(Boolean) as typeof selectedTickets; // Filter out nulls for invalid IDs

      if (ticketsFromUrl.length > 0) {
        setSelectedTickets(ticketsFromUrl);
      } else {
        // URL params provided but all ticket IDs were invalid or resulted in no tickets
        toast.error("Invalid ticket details provided in the URL. Please try again.");
        setRedirectPath(`/event/${id}`);
      }
    } else if (!isUsingUrlParams && queuePosition) { // User has a queue position record (not null)
      // Check for offered status and handle both new API (ticketDetails array) and legacy API (ticketTypeId)
      if (queuePosition.status === "offered" && queuePosition.ticketDetails) {
        const ticketsFromQueue = queuePosition.ticketDetails.map((detail) => {
          const ticketType = event.ticketTypes?.find(
            (t) => t.id === detail.ticketTypeId
          );
          return {
            id: detail.ticketTypeId,
            name: ticketType?.name || "Unknown Ticket",
            price: ticketType?.price || 0,
            quantity: detail.quantity,
          };
        });
        setSelectedTickets(ticketsFromQueue);
      } else if (
        queuePosition.status === "expired" ||
        queuePosition.status === "released"
      ) {
        toast.error("Your ticket reservation has expired or been released.");
        setRedirectPath(`/event/${id}`);
      } else if (queuePosition.status !== "offered") { // e.g. 'waiting', 'cancelled', etc.
        toast.info(
          `Your current queue status is '${queuePosition.status}'. No tickets have been offered yet.`
        );
        setRedirectPath(`/event/${id}`);
      }
    } else if (!isUsingUrlParams && queuePosition === null) {
      // No URL params and no queue record for this user/event (explicitly null, meaning query ran and found nothing)
      toast.info("No active reservation found. Please select tickets from the event page.");
      setRedirectPath(`/event/${id}`);
    }
    // Fallthrough: If isUsingUrlParams is true but ticketTypes is empty, or other edge cases,
    // no action is taken in this effect pass, potentially relying on user action or other effects.
  }, [event, queuePosition, id, setRedirectPath, isHydrated]);

  useEffect(() => {
    if (redirectPath) {
      router.replace(redirectPath);
    }
  }, [redirectPath, router]);

  // Simple variables for backward compatibility
  const ticketTypeId = searchParamsRef.current.isUsingUrlParams
    ? searchParamsRef.current.ticketTypes[0]
    : queuePosition?.ticketTypeId;
  const quantity = searchParamsRef.current.isUsingUrlParams
    ? parseInt(searchParamsRef.current.quantities[0] || "1", 10)
    : queuePosition?.quantity || 1;

  // Check if all tickets are free
  const isFreeEvent = selectedTickets.length > 0 && selectedTickets.every((ticket) => ticket.price === 0);

  // Calculate discount for a specific ticket type
  const calculateDiscountForTicket = (ticketTypeId: string, price: number) => {
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

  // Calculate subtotal, discounts and total
  const subtotal = selectedTickets.reduce((sum, ticket) => {
    return sum + ticket.price * ticket.quantity;
  }, 0);

  const discountAmount = selectedTickets.reduce((sum, ticket) => {
    return sum + calculateDiscountForTicket(ticket.id, ticket.price) * ticket.quantity;
  }, 0);

  const total = subtotal - discountAmount;

  // Initialize with user data when available
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      setFullName(user.fullName || "");
      setEmail(user.primaryEmailAddress?.emailAddress || "");

      // Initialize the first recipient with the user's info
      if (quantity > 1 && recipients.length === 0) {
        const initialRecipients: TicketRecipient[] = [
          {
            name: user.fullName || "",
            email: user.primaryEmailAddress?.emailAddress || "",
          },
        ];

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
    // Store current total before applying discount for animation
    setOriginalTotal(total);
    setDiscount(discountInfo);
    // Trigger animation
    setAnimatePrices(true);
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

    setIsLoading(true);
    setError(null);

    // If sending tickets to others, validate their info
    if (sendToOthers) {
      for (const recipient of recipients) {
        if (!recipient.name || !recipient.email) {
          setError("Please fill out all recipient information");
          setIsLoading(false);
          return;
        }
      }
    }

    // Check if we have tickets selected
    if (selectedTickets.length === 0) {
      setError("No tickets selected. Please try again.");
      setIsLoading(false);
      return;
    }

    // Prepare tickets data for payment processing
    const ticketsData = selectedTickets.map((ticket) => ({
      ticketTypeId: ticket.id,
      quantity: ticket.quantity,
      price: ticket.price,
    }));

    // Process payment via Paystack
    try {
      const fullPhone = `${dialCode}${phoneNumber.replace(/^0+/, "")}`;

      const result = await initializePaystackTransaction({
        eventId: id as Id<"events">,
        tickets: selectedTickets.map((t) => ({ ticketTypeId: t.id, quantity: t.quantity })),
        discountCode: discount?.code,
        customerInfo: {
          name: fullName,
          email: email,
          phone: fullPhone,
        },
        recipients: sendToOthers ? recipients : undefined,
      });

      if (result?.authorizationUrl) {
        console.log("Payment initialized, redirecting to:", result.authorizationUrl);
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

  if (!event || !isLoaded) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Verify we're using URL params or have a valid queue position
  useEffect(() => {
    if (!isHydrated) return; // Wait for hydration

    if (!searchParamsRef.current.isUsingUrlParams && (!queuePosition || queuePosition?.status !== "offered")) {
      // Use redirectPath state instead of direct router call
      setRedirectPath(`/event/${id}`);
    }
  }, [id, queuePosition, isHydrated, searchParamsRef]);

  // Format event date as "Sun 1 June | 2pm"
  let formattedDate = "TBA";
  if (event && event.eventDate) {
    const startDate = new Date(event.eventDate);
    const day = startDate.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = startDate.getDate();
    const month = startDate.toLocaleDateString("en-US", { month: "long" });
    const hours = startDate.getHours();
    const ampm = hours >= 12 ? "pm" : "am";
    const formattedHours = hours % 12 || 12;

    formattedDate = `${day} ${dayNum} ${month} | ${formattedHours}${ampm}`;
  }

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount).replace("NGN", "₦");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-600 mb-6 space-x-1">
        <Link href="/" className="hover:underline">
          Explore Events
        </Link>
        <span>/</span>
        <Link href={`/event/${id}`} className="hover:underline truncate max-w-xs inline-block align-baseline">
          {event.name}
        </Link>
        <span>/</span>
        <span className="text-red-600 font-semibold">Checkout</span>
      </nav>

      <h1 className="text-2xl font-semibold mb-6">Contact Information</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left column – Form */}
        <div className="md:col-span-2 space-y-8">
          {/* Contact Fields */}
          <div className="space-y-4 bg-white p-6 shadow rounded border border-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  value={fullName.split(" ")[0] ?? ""}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  value={fullName.split(" ").slice(1).join(" ") ?? ""}
                  onChange={() => {}}
                  placeholder="Enter your last name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="emailAddress">Email address</Label>
              <Input
                id="emailAddress"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@address.com"
              />
            </div>
            {/* Phone with country code selector */}
            <div>
              <Label htmlFor="phone">Phone number</Label>
              <div className="flex gap-2">
                <select
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  className="border rounded-lg px-3 py-2 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {dialCodes.map((d) => (
                    <option key={d.code} value={d.code}>{`${d.flag} ${d.code}`}</option>
                  ))}
                </select>
                <Input
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="8012345678"
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Checkbox
                id="termsDesktop"
                checked={isAgreedToTerms}
                onCheckedChange={(c) => setIsAgreedToTerms(!!c)}
              />
              <Label htmlFor="termsDesktop" className="text-sm">
                By clicking Register, I agree to the Ticwaka Terms of Service
              </Label>
            </div>
          </div>

          {/* Recipients, Discount etc – reuse existing sections rendered conditionally */}
          {quantity > 1 && (
            <div className="space-y-4 bg-white p-6 shadow rounded border border-gray-100">
              {/* existing Recipients UI here - reuse components */}
              {recipients.map((recipient, index) => (
                <div key={index} className="border border-gray-800 rounded-lg p-3 bg-gray-800">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-300">Recipient {index + 1}</span>

                    {index > 0 && (
                      <button
                        onClick={() => handleRemoveRecipient(index)}
                        className="text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div>
                      <Label htmlFor={`name-${index}`} className="text-gray-400 mb-1 block text-sm">
                        Name
                      </Label>
                      <Input
                        id={`name-${index}`}
                        value={recipient.name}
                        onChange={(e) => handleRecipientChange(index, "name", e.target.value)}
                        required
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>

                    <div>
                      <Label htmlFor={`email-${index}`} className="text-gray-400 mb-1 block text-sm">
                        Email
                      </Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={recipient.email}
                        onChange={(e) => handleRecipientChange(index, "email", e.target.value)}
                        required
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {recipients.length < quantity && (
                <button
                  className="w-full py-2 border border-gray-700 rounded-lg text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-800 transition-colors"
                  onClick={handleAddRecipient}
                >
                  <Plus className="w-4 h-4" />
                  Add Another Recipient
                </button>
              )}
            </div>
          )}

          {/* Discount */}
          {!isFreeEvent && (
            <div className="bg-white p-6 shadow rounded border border-gray-100">
              <DiscountCodeInput
                eventId={id as string}
                onDiscountApplied={handleDiscountApplied}
              />
            </div>
          )}

          {/* Submit button */}
          <div>
            {error && <p className="text-red-600 mb-2 text-sm text-center">{error}</p>}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !isAgreedToTerms}
              className={`w-full py-3 rounded-full font-semibold text-white ${
                isLoading || !isAgreedToTerms
                  ? "bg-gray-400"
                  : "bg-gradient-to-r from-red-600 to-red-400 hover:from-red-700 hover:to-red-500"
              }`}
            >
              {isLoading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : isFreeEvent ? (
                "Get Free Ticket"
              ) : (
                "Proceed to make payment"
              )}
            </button>
          </div>
        </div>

        {/* Right column – Order summary */}
        <div className="bg-white shadow rounded-xl border border-gray-100 overflow-hidden">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt={event.name}
              width={500}
              height={300}
              className="w-full h-48 object-cover"
            />
          )}
          <div className="p-6 space-y-4">
            <h2 className="font-semibold text-lg leading-tight">{event.name}</h2>
            <p className="text-base font-semibold text-gray-700 tracking-wide">{formattedDate}</p>
            <p className="text-sm text-gray-600">{event.location}</p>
            <Separator />
            <h3 className="font-semibold">Order summary</h3>
            {selectedTickets.map((t) => (
              <div key={t.id} className="flex justify-between text-sm">
                <span>
                  {t.quantity} x {t.name}
                </span>
                <span>
                  {t.price > 0 
                    ? formatCurrency(t.price * t.quantity)
                    : <span className="text-green-500 font-semibold">FREE</span>
                  }
                </span>
              </div>
            ))}
            <Separator />
            {discount && (
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  <BadgePercent className="h-4 w-4 text-green-500" />
                  Discount ({discount.discountType === "percentage" ? `${discount.discountAmount}%` : `₦${discount.discountAmount}`})
                </span>
                <span className="text-green-600">
                  -{formatCurrency(originalTotal - total)}
                </span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>
                {animatePrices && discount ? (
                  <CountUp 
                    start={originalTotal} 
                    end={total} 
                    duration={1.5} 
                    separator=","
                    decimals={2}
                    decimal="."
                    prefix="₦"
                    onEnd={() => setAnimatePrices(false)}
                  />
                ) : (
                  total > 0 ? formatCurrency(total) : <span className="text-green-500 font-semibold">FREE</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}