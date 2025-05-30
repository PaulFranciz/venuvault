"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CalendarIcon, TicketIcon, PlusIcon, TrashIcon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { toast } from "sonner";

interface DiscountCodeManagerProps {
  eventId: Id<"events">;
}

type DiscountType = "percentage" | "fixed";

interface DiscountCode {
  _id: Id<"discountCodes">;
  code: string;
  eventId: Id<"events">;
  createdBy: string;
  discountType: DiscountType;
  discountAmount: number;
  validFrom: number;
  validUntil: number;
  maxUses?: number;
  currentUses: number;
  ticketTypeIds?: string[];
  isActive: boolean;
}

export default function DiscountCodeManager({ eventId }: DiscountCodeManagerProps) {
  // States for new discount code form
  const [discountType, setDiscountType] = useState<DiscountType>("percentage");
  const [discountAmount, setDiscountAmount] = useState<number>(10);
  const [validFrom, setValidFrom] = useState<Date>(new Date());
  const [validUntil, setValidUntil] = useState<Date>(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1); // Default to one month validity
    return date;
  });
  const [maxUses, setMaxUses] = useState<number | undefined>(undefined);
  const [isLimitedUses, setIsLimitedUses] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Fetch discount codes for this event
  const discountCodes = useQuery(api.discountCodes.getByEventId, { eventId }) as DiscountCode[] | undefined;
  
  // Generate code mutation
  const generateCode = useMutation(api.discountCodes.generateCode);

  // Tabs state
  const [activeTab, setActiveTab] = useState<string>("active");

  // Filter codes based on active tab
  const filteredCodes = discountCodes?.filter(code => {
    if (activeTab === "active") return code.isActive && new Date(code.validUntil) >= new Date();
    if (activeTab === "expired") return !code.isActive || new Date(code.validUntil) < new Date();
    return true;
  });

  // Handle form submission
  const handleCreateCode = async () => {
    if (discountType === "percentage" && (discountAmount <= 0 || discountAmount > 100)) {
      toast.error("Invalid discount amount", {
        description: "Percentage discount must be between 1 and 100"
      });
      return;
    }

    if (discountType === "fixed" && discountAmount < 0) {
      toast.error("Invalid discount amount", {
        description: "Fixed discount amount cannot be negative"
      });
      return;
    }

    setIsCreating(true);
    try {
      const result = await generateCode({
        eventId,
        createdBy: "current-user", // This would ideally come from auth
        discountType,
        discountAmount,
        validFrom: validFrom.getTime(),
        validUntil: validUntil.getTime(),
        maxUses: isLimitedUses ? maxUses : undefined,
        // We're not implementing ticket type specific discounts in this version
        ticketTypeIds: undefined
      });

      toast.success("Discount code created", {
        description: `Your new discount code is: ${result.code}`
      });

      // Reset form
      setDiscountType("percentage");
      setDiscountAmount(10);
      const today = new Date();
      setValidFrom(today);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setValidUntil(nextMonth);
      setMaxUses(undefined);
      setIsLimitedUses(false);
    } catch (error) {
      toast.error("Error creating discount code", {
        description: error instanceof Error ? error.message : "An unknown error occurred"
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-xl font-semibold text-[#0C090C]">Create New Discount Code</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="discountType">Discount Type</Label>
              <RadioGroup
                value={discountType}
                onValueChange={(value) => setDiscountType(value as DiscountType)}
                className="flex space-x-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="percentage" />
                  <Label htmlFor="percentage">Percentage (%)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="fixed" />
                  <Label htmlFor="fixed">Fixed Amount (₦)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="discountAmount">Discount Amount</Label>
              <Input
                id="discountAmount"
                type="number"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                min={0}
                max={discountType === "percentage" ? 100 : undefined}
                className="mt-2"
              />
              {discountType === "percentage" && (
                <p className="text-sm text-gray-500 mt-1">Enter a value between 1 and 100</p>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="limitUses"
                  checked={isLimitedUses}
                  onChange={(e) => setIsLimitedUses(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="limitUses">Limit number of uses</Label>
              </div>
              {isLimitedUses && (
                <Input
                  id="maxUses"
                  type="number"
                  value={maxUses || ""}
                  onChange={(e) => setMaxUses(e.target.value ? Number(e.target.value) : undefined)}
                  min={1}
                  placeholder="Maximum number of uses"
                  className="mt-2"
                />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Valid From</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-2"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(validFrom, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={validFrom}
                    onSelect={(date) => date && setValidFrom(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Valid Until</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal mt-2"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(validUntil, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={validUntil}
                    onSelect={(date) => date && setValidUntil(date)}
                    initialFocus
                    disabled={(date) => date < validFrom}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button 
              className="w-full mt-6 bg-[#F96521] hover:bg-[#F96521]/90 text-white"
              onClick={handleCreateCode}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Generate Discount Code"}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-[#0C090C]">Manage Discount Codes</h2>
        </div>

        <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">Active Codes</TabsTrigger>
              <TabsTrigger value="expired">Expired/Inactive</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="active" className="p-6">
            {!discountCodes ? (
              <div className="text-center py-12">
                <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Loading discount codes...</p>
              </div>
            ) : filteredCodes?.length === 0 ? (
              <div className="text-center py-12">
                <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No active discount codes</h3>
                <p className="mt-1 text-gray-500">Create your first discount code to start offering deals.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3">Valid Period</th>
                      <th className="px-4 py-3">Usage</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCodes?.map((code) => (
                      <tr key={code._id.toString()} className="hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium">{code.code}</td>
                        <td className="px-4 py-4">
                          {code.discountType === "percentage" ? `${code.discountAmount}%` : `₦${code.discountAmount}`}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div>From: {format(new Date(code.validFrom), "MMM dd, yyyy")}</div>
                            <div>Until: {format(new Date(code.validUntil), "MMM dd, yyyy")}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {code.currentUses} {code.maxUses ? `/ ${code.maxUses}` : ''}
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="expired" className="p-6">
            {!discountCodes ? (
              <div className="text-center py-12">
                <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-gray-500">Loading discount codes...</p>
              </div>
            ) : filteredCodes?.length === 0 ? (
              <div className="text-center py-12">
                <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900">No expired or inactive discount codes</h3>
                <p className="mt-1 text-gray-500">Expired and deactivated codes will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Discount</th>
                      <th className="px-4 py-3">Valid Period</th>
                      <th className="px-4 py-3">Usage</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredCodes?.map((code) => (
                      <tr key={code._id.toString()} className="hover:bg-gray-50">
                        <td className="px-4 py-4 font-medium">{code.code}</td>
                        <td className="px-4 py-4">
                          {code.discountType === "percentage" ? `${code.discountAmount}%` : `₦${code.discountAmount}`}
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <div>From: {format(new Date(code.validFrom), "MMM dd, yyyy")}</div>
                            <div>Until: {format(new Date(code.validUntil), "MMM dd, yyyy")}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {code.currentUses} {code.maxUses ? `/ ${code.maxUses}` : ''}
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            {!code.isActive ? "Inactive" : "Expired"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}