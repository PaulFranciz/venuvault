"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type TicketType = {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  remaining: number;
  isSoldOut?: boolean;
  isHidden?: boolean;
  allowGroupPurchase?: boolean;
  maxPerTransaction?: number;
  minPerTransaction?: number;
};

interface TicketTypeSelectorProps {
  ticketTypes: TicketType[];
  defaultPrice?: number | string;
  onTicketSelect: (ticketTypeId: string, quantity: number) => void;
  availability?: any; // Replace with proper type when available
}

export default function TicketTypeSelector({ 
  ticketTypes = [], 
  defaultPrice = 0,
  onTicketSelect,
  availability 
}: TicketTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<string | null>(
    ticketTypes.length > 0 ? ticketTypes[0].id : null
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(
    ticketTypes.reduce((acc, type) => ({
      ...acc,
      [type.id]: 1
    }), {})
  );

  // If no ticket types, use default price
  if (!ticketTypes || ticketTypes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">General Admission</h3>
            <p className="text-sm text-gray-500">Standard ticket</p>
          </div>
          <div className="text-lg font-bold text-blue-600">
            {typeof defaultPrice === "string" ? defaultPrice : `₦${defaultPrice.toFixed(2)}`}
          </div>
        </div>
      </div>
    );
  }

  const handleQuantityChange = (typeId: string, newQuantity: number) => {
    const ticketType = ticketTypes.find(type => type.id === typeId);
    if (!ticketType) return;

    // Apply min/max constraints
    const min = ticketType.minPerTransaction || 1;
    const max = ticketType.maxPerTransaction || ticketType.remaining;
    
    // Ensure new quantity is within valid range
    newQuantity = Math.max(min, Math.min(newQuantity, max));
    
    setQuantities(prev => ({
      ...prev,
      [typeId]: newQuantity
    }));

    // Update parent component with the selected type and quantity
    if (typeId === selectedType) {
      onTicketSelect(typeId, newQuantity);
    }
  };

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    onTicketSelect(typeId, quantities[typeId] || 1);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y">
      {ticketTypes
        .filter(type => !type.isHidden)
        .map(ticketType => {
          const isSelected = selectedType === ticketType.id;
          const isSoldOut = ticketType.isSoldOut || ticketType.remaining <= 0;
        
          return (
            <div 
              key={ticketType.id}
              className={`border-b last:border-b-0 ${
                isSelected 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-200 bg-white'
              } ${
                isSoldOut ? 'opacity-60' : ''
              }`}
            >
              <div 
                className="p-4 cursor-pointer flex justify-between items-center"
                onClick={() => !isSoldOut && handleTypeSelect(ticketType.id)}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{ticketType.name}</h4>
                    {ticketType.description && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info size={16} className="text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">{ticketType.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    {ticketType.remaining <= 5 && ticketType.remaining > 0 && (
                      <span className="text-amber-600 font-medium">
                        Only {ticketType.remaining} left!
                      </span>
                    )}
                    {isSoldOut && (
                      <span className="text-red-500 font-medium">
                        Sold Out
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-lg font-bold text-blue-600">
                  {ticketType.price === 0 ? "Free" : `₦${ticketType.price.toFixed(2)}`}
                </div>
              </div>
              
              {isSelected && !isSoldOut && (
                <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quantity:</span>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleQuantityChange(
                          ticketType.id, 
                          quantities[ticketType.id] - 1
                        )}
                        disabled={quantities[ticketType.id] <= (ticketType.minPerTransaction || 1)}
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50"
                      >
                        <ChevronDown size={18} />
                      </button>
                      
                      <span className="w-8 text-center font-medium">
                        {quantities[ticketType.id] || 1}
                      </span>
                      
                      <button
                        onClick={() => handleQuantityChange(
                          ticketType.id, 
                          quantities[ticketType.id] + 1
                        )}
                        disabled={
                          quantities[ticketType.id] >= (
                            ticketType.maxPerTransaction || 
                            ticketType.remaining
                          )
                        }
                        className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center disabled:opacity-50"
                      >
                        <ChevronUp size={18} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-right">
                    <span className="text-sm text-gray-600">
                      Total: <strong className="text-blue-600">₦{(ticketType.price * quantities[ticketType.id]).toFixed(2)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}