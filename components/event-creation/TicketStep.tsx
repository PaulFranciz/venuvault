import * as React from 'react';
import { useState, useMemo, useEffect } from 'react';
import { EventFormData, TicketType, VendorPassType } from '@/app/create-event/page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, X, Ticket, DollarSign, Calendar, Info, Edit2, Trash2, ChevronDown, ChevronUp, Globe, Video } from 'lucide-react';
import Spinner from '@/components/Spinner';
import { useEventForm } from '@/providers/EventFormProvider';
import { calculatePlatformFee, formatCurrency, currencyConfigurations, Currency } from '@/lib/currencyUtils';

interface TicketStepProps {
  onNext: () => void;
  onBack?: () => void;
  isSubmitting?: boolean;
}

// Using the TicketType interface imported from '@/app/create-event/page'

const TicketStep: React.FC<TicketStepProps> = ({
  onNext,
  onBack,
  isSubmitting,
}) => {
  const { formData, setFormData } = useEventForm();
  
  const [ticketTypes, setTicketTypes] = useState<TicketType[]>(formData.ticketTypes || []);
  
  const [editingTicket, setEditingTicket] = useState<TicketType | null>(null);
  const [showTicketForm, setShowTicketForm] = useState(false);
  // Define the initial ticket state with explicit type to include isFree and recurring event fields
  const [newTicket, setNewTicket] = useState<TicketType>({
    id: '',
    name: '',
    price: '0',
    quantity: '',
    description: '',
    unlimited: false,
    startDate: '',
    endDate: '',
    recurringEvent: false,
    recurringFrequency: 'weekly',
    recurringDays: [],
    recurringEndDate: '',
    isFree: false,
  } as TicketType);
  
  const [currency, setCurrency] = useState<Currency>(formData.currency || 'USD');
  const [platformFeePaidBy, setPlatformFeePaidBy] = useState<'buyer' | 'creator'>(formData.platformFeePaidBy || 'buyer');

  const [vendorPassesEnabled, setVendorPassesEnabled] = useState(formData.vendorPassesEnabled || false);
  const [refundPolicyEnabled, setRefundPolicyEnabled] = useState(formData.refundPolicyEnabled || false);

  const [vendorPasses, setVendorPasses] = useState<VendorPassType[]>(formData.vendorPasses || []);
  const [editingVendorPass, setEditingVendorPass] = useState<VendorPassType | null>(null);
  const [showVendorPassForm, setShowVendorPassForm] = useState(false);
  const [newVendorPass, setNewVendorPass] = useState<VendorPassType>({
    id: '',
    name: '',
    price: '0',
    quantity: '',
    description: '',
    unlimited: false,
  });

  useEffect(() => {
    setFormData({
      ticketTypes,
      currency,
      platformFeePaidBy,
      vendorPassesEnabled,
      refundPolicyEnabled,
      vendorPasses,
    });
  }, [
    ticketTypes, 
    currency, 
    platformFeePaidBy, 
    vendorPassesEnabled, 
    refundPolicyEnabled, 
    vendorPasses, 
    setFormData
  ]);
  
  const handleAddTicket = () => {
    if (newTicket.name) {
      const ticketId = `ticket-${Date.now()}`;
      const ticketToAdd: TicketType = {
        ...newTicket,
        id: ticketId,
        price: newTicket.isFree ? '0.00' : parseFloat(newTicket.price).toFixed(2), 
        quantity: newTicket.unlimited ? 'Unlimited' : newTicket.quantity,
      };
      
      const updatedTickets = [...ticketTypes, ticketToAdd];
      setTicketTypes(updatedTickets);
      
      setNewTicket({
        id: '', name: '', price: '0', quantity: '', description: '', unlimited: false, startDate: '', endDate: '', recurringEvent: false, isFree: false
      } as TicketType);
      setShowTicketForm(false);
    }
  };

  const handleEditTicket = (ticket: TicketType) => {
    setEditingTicket(ticket);
    setNewTicket({
        ...ticket,
        // Ensure price is always a string and never undefined
        price: ticket.price ? parseFloat(ticket.price).toString() : '0', 
        quantity: ticket.unlimited ? '' : (ticket.quantity || ''),
        // Ensure isFree is always a boolean
        isFree: ticket.isFree === true
    });
    setShowTicketForm(true);
  };

  const handleUpdateTicket = () => {
    if (editingTicket && newTicket.name) {
      const updatedTicketData: TicketType = {
        ...newTicket,
        id: editingTicket.id,
        price: newTicket.isFree ? '0.00' : parseFloat(newTicket.price).toFixed(2),
        quantity: newTicket.unlimited ? 'Unlimited' : newTicket.quantity,
      };
      const updatedTickets = ticketTypes.map(ticket => 
        ticket.id === editingTicket.id ? updatedTicketData : ticket
      );
      
      setTicketTypes(updatedTickets);
      
      setEditingTicket(null);
      setNewTicket({
        id: '', name: '', price: '0', quantity: '', description: '', unlimited: false, startDate: '', endDate: '', recurringEvent: false, isFree: false
      } as TicketType);
      setShowTicketForm(false);
    }
  };

  const handleRemoveTicket = (id: string) => {
    const updatedTickets = ticketTypes.filter(ticket => ticket.id !== id);
    setTicketTypes(updatedTickets);
  };

  const handleAddVendorPass = () => {
    if (newVendorPass.name && newVendorPass.price) {
      const passId = `vendorpass-${Date.now()}`;
      const passToAdd: VendorPassType = {
        ...newVendorPass,
        id: passId,
        price: parseFloat(newVendorPass.price).toFixed(2),
        quantity: newVendorPass.unlimited ? 'Unlimited' : newVendorPass.quantity,
      };
      
      const updatedPasses = [...vendorPasses, passToAdd];
      setVendorPasses(updatedPasses);
      
      setNewVendorPass({
        id: '', name: '', price: '0', quantity: '', description: '', unlimited: false
      });
      setShowVendorPassForm(false);
    }
  };

  const handleEditVendorPass = (pass: VendorPassType) => {
    setEditingVendorPass(pass);
    setNewVendorPass({
        ...pass,
        price: parseFloat(pass.price).toString(),
        quantity: pass.unlimited ? '' : pass.quantity,
    });
    setShowVendorPassForm(true);
  };

  const handleUpdateVendorPass = () => {
    if (editingVendorPass && newVendorPass.name && newVendorPass.price) {
      const updatedPassData: VendorPassType = {
        ...newVendorPass,
        id: editingVendorPass.id,
        price: parseFloat(newVendorPass.price).toFixed(2),
        quantity: newVendorPass.unlimited ? 'Unlimited' : newVendorPass.quantity,
      };
      const updatedPasses = vendorPasses.map(pass => 
        pass.id === editingVendorPass.id ? updatedPassData : pass
      );
      
      setVendorPasses(updatedPasses);
      
      setEditingVendorPass(null);
      setNewVendorPass({
        id: '', name: '', price: '0', quantity: '', description: '', unlimited: false
      });
      setShowVendorPassForm(false);
    }
  };

  const handleRemoveVendorPass = (id: string) => {
    const updatedPasses = vendorPasses.filter(pass => pass.id !== id);
    setVendorPasses(updatedPasses);
  };

  const handleCurrencyChange = (value: Currency) => {
    setCurrency(value);
  };

  const handlePlatformFeeChange = (value: 'buyer' | 'creator') => {
    setPlatformFeePaidBy(value);
  };

  const handleToggleVendorPasses = () => {
    setVendorPassesEnabled(prev => !prev);
  };

  const handleToggleRefundPolicy = () => {
    setRefundPolicyEnabled(prev => !prev);
  };

  return (
    <div className="space-y-8 font-pally bg-[#0D0D0D] text-white p-4 md:p-0">
      <div className="bg-[#1C1C1C] rounded-lg p-6">
        <h2 className="text-xl font-medium mb-6 text-white">Event Tickets</h2>
        
        <div className="mb-6">
          <Label className="block text-sm font-medium text-gray-300 mb-1">Currency</Label>
          <div className="bg-[#2A2A2A] rounded-md p-1 inline-flex items-center">
            {(Object.keys(currencyConfigurations) as Currency[]).map((currencyCode: Currency) => (
              <button
                key={currencyCode}
                className={`px-3 py-1 rounded text-sm ${currency === currencyCode ? 'bg-[#F96521] text-white' : 'text-gray-400 hover:bg-gray-600'}`}
                onClick={() => handleCurrencyChange(currencyCode)}
              >
                {currencyCode}
              </button>
            ))}
          </div>
        </div>
            
        <div className="mb-8">
          <Label className="block text-sm font-medium text-gray-300 mb-2">Platform Fee Paid By</Label>
          <div className="flex space-x-3 items-center mb-2">
            <button
              type="button"
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm border ${platformFeePaidBy === 'buyer' ? 'bg-[#F96521] border-[#F96521] text-white' : 'bg-transparent border-gray-600 text-gray-300 hover:border-gray-500'}`}
              onClick={() => handlePlatformFeeChange('buyer')}
            >
              <div className={`w-4 h-4 rounded-full border-2 ${platformFeePaidBy === 'buyer' ? 'border-white bg-white' : 'border-gray-400'}`}>
                {platformFeePaidBy === 'buyer' && <div className="w-2 h-2 rounded-full bg-[#F96521] m-0.5"></div>}
              </div>
              <span>Ticket Buyer</span>
            </button>
            <button
              type="button"
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm border ${platformFeePaidBy === 'creator' ? 'bg-[#F96521] border-[#F96521] text-white' : 'bg-transparent border-gray-600 text-gray-300 hover:border-gray-500'}`}
              onClick={() => handlePlatformFeeChange('creator')}
            >
               <div className={`w-4 h-4 rounded-full border-2 ${platformFeePaidBy === 'creator' ? 'border-white bg-white' : 'border-gray-400'}`}>
                {platformFeePaidBy === 'creator' && <div className="w-2 h-2 rounded-full bg-[#F96521] m-0.5"></div>}
              </div>
              <span>Me (Creator)</span>
            </button>
          </div>
          <p className="text-xs text-gray-400">
            {platformFeePaidBy === 'buyer' 
              ? 'The platform fee will be added to the ticket price for the buyer.'
              : 'The platform fee will be deducted from your ticket sales.'}
          </p>
        </div>

        {/* Price Display Preview */}
        {ticketTypes.length > 0 && (
          <div className="mb-6 p-4 bg-[#2A2A2A] rounded-lg border border-[#3A3A3A]">
            <h3 className="text-sm font-pally-medium text-gray-300 mb-2 flex items-center">
              <Info className="w-4 h-4 mr-2 text-blue-400" />
              Event Card Price Display Preview
            </h3>
            <div className="flex items-center">
              <span className={`px-3 py-1 text-sm rounded-full font-pally-semibold ${
                ticketTypes.length > 1 && new Set(ticketTypes.filter(t => !t.isHidden).map(t => t.price)).size > 1
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}>
                {ticketTypes.length > 1 && new Set(ticketTypes.filter(t => !t.isHidden).map(t => t.price)).size > 1
                  ? "Explore all prices"
                  : ticketTypes.some(t => t.isFree)
                    ? "Free"
                    : `${currencyConfigurations[currency].symbol}${parseFloat(ticketTypes[0].price).toLocaleString('en-NG')}`
                }
              </span>
              <span className="ml-3 text-xs text-gray-400">
                {ticketTypes.length > 1 && new Set(ticketTypes.filter(t => !t.isHidden).map(t => t.price)).size > 1
                  ? "Multiple price tiers will show this on the event card"
                  : "Single price tier or uniform pricing"}
              </span>
            </div>
          </div>
        )}

        {/* Ticket List or Form */}
        {!showTicketForm ? (
          <div className="space-y-4">
            {ticketTypes.length === 0 && (
              <p className="text-gray-400 text-center py-4">No tickets added yet.</p>
            )}
            {ticketTypes.map(ticket => {
              const priceNum = parseFloat(ticket.price);
              const fee = calculatePlatformFee(ticket.price, currency);
              const totalIfBuyerPays = priceNum + fee;
              const creatorPayout = priceNum - fee;
              
              // Determine if this is a virtual event ticket
              const isVirtualEvent = formData.locationType === 'virtual';
              
              return (
                <div key={ticket.id} className="bg-[#2A2A2A] rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-md font-semibold text-white">{ticket.name}</h3>
                      {ticket.isFree && <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded">FREE</span>}
                      {isVirtualEvent && <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded flex items-center"><Video size={10} className="mr-1"/> Virtual</span>}
                    </div>
                    
                    {(ticket.startDate && ticket.endDate) && (
                        <p className="text-xs text-gray-400 flex items-center"><Calendar size={12} className="mr-1"/> {ticket.startDate} - {ticket.endDate}</p>
                    )}
                    <div className="mt-2 text-sm">
                      {ticket.isFree ? (
                        <>
                          <p className="text-white font-semibold">FREE</p>
                          <p className="text-green-500 text-xs">No platform fees</p>
                        </>
                      ) : platformFeePaidBy === 'buyer' ? (
                        <>
                          <p className="text-white">{formatCurrency(priceNum, currency)} <span className="text-gray-400 text-xs">(Ticket)</span></p>
                          {priceNum > 0 && <p className="text-gray-400 text-xs">+ Platform Fee {formatCurrency(fee, currency)}</p>}
                          <p className="text-white font-semibold">{formatCurrency(totalIfBuyerPays, currency)} <span className="text-gray-400 text-xs">(Total)</span></p>
                        </>
                      ) : (
                        <>
                          <p className="text-white">{formatCurrency(priceNum, currency)} <span className="text-gray-400 text-xs">(Ticket Price)</span></p>
                          {priceNum > 0 && <p className="text-gray-400 text-xs">- Platform Fee {formatCurrency(fee, currency)}</p>}
                          <p className="text-white font-semibold">{formatCurrency(creatorPayout, currency)} <span className="text-gray-400 text-xs">(Your Payout)</span></p>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {ticket.unlimited ? 'Unlimited available' : `${ticket.quantity} tickets available`}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditTicket(ticket)} className="text-gray-400 hover:text-white">
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveTicket(ticket.id)} className="text-red-500 hover:text-red-400">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button 
              onClick={() => { setShowTicketForm(true); setEditingTicket(null); setNewTicket({ id: '', name: '', price: '0', quantity: '', description: '', unlimited: false, startDate: '', endDate: '', recurringEvent: false, isFree: false } as TicketType); }}
              className="w-full bg-[#F96521] hover:bg-[#E05A1F] text-white py-3 text-sm font-semibold rounded-md flex items-center justify-center">
              <Plus size={18} className="mr-2" /> Add New Ticket Type
            </Button>
          </div>
        ) : ( 
          /* Add/Edit Ticket Form */
          <div className="bg-[#2A2A2A] rounded-lg p-6 border border-red-500">
            {/* Virtual Event Notification */}
            {formData.locationType === 'virtual' && (
              <div className="mb-4 p-3 bg-blue-900/30 border border-blue-700 rounded-md flex items-center gap-3">
                <Globe className="h-5 w-5 text-blue-400 shrink-0" />
                <div>
                  <p className="text-sm text-white font-medium">Virtual Event</p>
                  <p className="text-xs text-gray-300">Creating tickets for a virtual event at: <span className="text-blue-400">{formData.virtualLink}</span></p>
                </div>
              </div>
            )}
            <h3 className="text-lg font-semibold mb-4 text-white">{editingTicket ? 'Edit Ticket' : 'Add New Ticket'}</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ticketName" className="block text-xs font-medium text-gray-300 mb-1">Ticket Name</Label>
                <Input 
                  id="ticketName" 
                  type="text" 
                  value={newTicket.name} 
                  onChange={(e) => setNewTicket({...newTicket, name: e.target.value})} 
                  placeholder="General Admission" 
                  className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div className="flex items-center justify-between mb-4">
                <Label htmlFor="isFreeTicket" className="text-xs font-medium text-gray-300">Free Ticket <span className="text-green-400">(No platform fees)</span></Label>
                <Switch 
                  id="isFreeTicket" 
                  checked={newTicket.isFree === true}
                  onCheckedChange={(checked) => {
                    // When toggling to free, always set price to '0'
                    // When toggling from free, set price to '0' if it was previously undefined
                    const newPrice = checked ? '0' : (newTicket.price !== '0' ? newTicket.price : '0');
                    setNewTicket({...newTicket, isFree: checked, price: newPrice});
                  }}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className="block text-xs font-medium text-gray-300 mb-1">Price ({currency})</Label>
                  <Input 
                    id="price" 
                    type="number" 
                    value={newTicket.price || '0'} // Ensure value is never undefined
                    onChange={(e) => setNewTicket({...newTicket, price: e.target.value})} 
                    placeholder="0.00"
                    disabled={newTicket.isFree === true}
                    className={`bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500 ${newTicket.isFree === true ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <Label htmlFor="quantity" className="block text-xs font-medium text-gray-300 mb-1">Quantity</Label>
                  <Input 
                    id="quantity" 
                    type="number" 
                    value={newTicket.quantity}
                    onChange={(e) => setNewTicket({...newTicket, quantity: e.target.value})} 
                    placeholder="Unlimited" 
                    disabled={newTicket.unlimited}
                    className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500 disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                  <Label htmlFor="unlimitedQuantity" className="text-xs text-gray-300">Unlimited Quantity</Label>
                  <Switch 
                    id="unlimitedQuantity" 
                    checked={newTicket.unlimited} 
                    onCheckedChange={(checked) => setNewTicket({...newTicket, unlimited: checked, quantity: checked ? 'Unlimited' : ''})} 
                    className="data-[state=checked]:bg-red-500"
                  />
              </div>
              <div>
                <Label htmlFor="dateRange" className="block text-xs font-medium text-gray-300 mb-1">Available Date Range</Label>
                <div className="flex space-x-2">
                    <Input 
                        id="startDate" 
                        type="date" 
                        value={newTicket.startDate} 
                        onChange={(e) => setNewTicket({...newTicket, startDate: e.target.value})} 
                        className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500 w-1/2"
                    />
                    <Input 
                        id="endDate" 
                        type="date" 
                        value={newTicket.endDate} 
                        onChange={(e) => setNewTicket({...newTicket, endDate: e.target.value})} 
                        className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500 w-1/2"
                    />
                </div>
              </div>
              <div>
                <Label htmlFor="description" className="block text-xs font-medium text-gray-300 mb-1">Description (Optional)</Label>
                <Textarea 
                  id="description" 
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} 
                  placeholder="VIP access, early entry, etc."
                  className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500 h-20"
                />
              </div>
              {/* Recurring Event Toggle with Enhanced UI */}
              <div className="border-t border-gray-700 pt-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label htmlFor="recurringEvent" className="text-sm font-medium text-gray-200">Recurring Event</Label>
                    <p className="text-xs text-gray-400 mt-0.5">Set up an event that repeats on a schedule</p>
                  </div>
                  <Switch 
                    id="recurringEvent" 
                    checked={!!newTicket.recurringEvent} 
                    onCheckedChange={(checked) => setNewTicket({...newTicket, recurringEvent: checked})} 
                    className="data-[state=checked]:bg-[#F96521]"
                  />
                </div>

                {/* Recurring Event Options - Only visible when recurring is enabled */}
                {newTicket.recurringEvent && (
                  <div className="bg-[#292929] rounded-lg p-4 space-y-4 mt-2 border border-gray-700">
                    <div>
                      <Label htmlFor="recurringFrequency" className="block text-xs font-medium text-gray-300 mb-1">Frequency</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['daily', 'weekly', 'monthly'].map((frequency) => (
                          <Button 
                            key={frequency}
                            type="button" 
                            onClick={() => setNewTicket({...newTicket, recurringFrequency: frequency as 'daily' | 'weekly' | 'monthly'})}
                            className={`${newTicket.recurringFrequency === frequency 
                              ? 'bg-[#F96521] hover:bg-[#E05A1F] text-white' 
                              : 'bg-[#333333] hover:bg-[#444444] text-gray-300'}`}
                          >
                            {frequency.charAt(0).toUpperCase() + frequency.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {newTicket.recurringFrequency === 'weekly' && (
                      <div>
                        <Label className="block text-xs font-medium text-gray-300 mb-1">Days of Week</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
                            const isSelected = newTicket.recurringDays?.includes(index);
                            return (
                              <Button 
                                key={day}
                                type="button" 
                                onClick={() => {
                                  const currentDays = newTicket.recurringDays || [];
                                  const newDays = isSelected
                                    ? currentDays.filter(d => d !== index)
                                    : [...currentDays, index];
                                  setNewTicket({...newTicket, recurringDays: newDays});
                                }}
                                className={`w-10 h-10 rounded-full p-0 ${isSelected 
                                  ? 'bg-[#F96521] hover:bg-[#E05A1F] text-white' 
                                  : 'bg-[#333333] hover:bg-[#444444] text-gray-300'}`}
                              >
                                {day}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {newTicket.recurringFrequency === 'monthly' && (
                      <div>
                        <Label className="block text-xs font-medium text-gray-300 mb-1">Day of Month</Label>
                        <div className="grid grid-cols-7 gap-1.5">
                          {Array.from({length: 31}, (_, i) => i + 1).map((day) => {
                            const isSelected = newTicket.recurringDays?.includes(day);
                            return (
                              <Button 
                                key={day}
                                type="button" 
                                onClick={() => {
                                  const currentDays = newTicket.recurringDays || [];
                                  const newDays = isSelected
                                    ? currentDays.filter(d => d !== day)
                                    : [...currentDays, day];
                                  setNewTicket({...newTicket, recurringDays: newDays});
                                }}
                                className={`w-9 h-9 rounded-full p-0 ${isSelected 
                                  ? 'bg-[#F96521] hover:bg-[#E05A1F] text-white' 
                                  : 'bg-[#333333] hover:bg-[#444444] text-gray-300'}`}
                              >
                                {day}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="recurringEndDate" className="block text-xs font-medium text-gray-300 mb-1">End Date</Label>
                      <Input 
                        id="recurringEndDate" 
                        type="date" 
                        value={newTicket.recurringEndDate} 
                        onChange={(e) => setNewTicket({...newTicket, recurringEndDate: e.target.value})} 
                        className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowTicketForm(false)} className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white">
                  Cancel
                </Button>
                <Button type="button" onClick={editingTicket ? handleUpdateTicket : handleAddTicket} className="bg-[#F96521] hover:bg-[#E05A1F] text-white">
                  {isSubmitting ? <Spinner size="sm" /> : (editingTicket ? 'Save Ticket' : 'Add Ticket')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#1C1C1C] rounded-lg p-6 flex justify-between items-center">
        <div>
          <h3 className="text-md font-semibold text-white flex items-center">
            Vendor Passes 
            <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-gray-700 text-gray-300 rounded-full">OPTIONAL</span>
          </h3>
          <p className="text-xs text-gray-400 mt-1">Create vendor passes for sale access at your events</p>
        </div>
        <Switch 
            checked={vendorPassesEnabled} 
            onCheckedChange={handleToggleVendorPasses} 
            className="data-[state=checked]:bg-red-500"
        />
      </div>

      {vendorPassesEnabled && (
        <div className="bg-[#2A2A2A] rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-4 text-white">Vendor Passes</h3>
          {!showVendorPassForm ? (
            <div className="space-y-4">
              {vendorPasses.length === 0 && (
                <p className="text-gray-400 text-center py-4">No vendor passes added yet.</p>
              )}
              {vendorPasses.map(pass => (
                <div key={pass.id} className="bg-[#333333] rounded-lg p-4 flex justify-between items-start">
                  <div>
                    <h4 className="text-md font-semibold text-white">{pass.name}</h4>
                    <p className="text-white font-semibold">{formatCurrency(parseFloat(pass.price), currency)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {pass.unlimited ? 'Unlimited available' : `${pass.quantity} passes available`}
                    </p>
                    {pass.description && <p className="text-xs text-gray-300 mt-1">{pass.description}</p>}
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditVendorPass(pass)} className="text-gray-400 hover:text-white">
                      <Edit2 size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveVendorPass(pass.id)} className="text-red-500 hover:text-red-400">
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
              <Button 
                onClick={() => { setShowVendorPassForm(true); setEditingVendorPass(null); setNewVendorPass({ id: '', name: '', price: '0', quantity: '', description: '', unlimited: false }); }}
                className="w-full bg-[#F96521] hover:bg-[#E05A1F] text-white py-3 text-sm font-semibold rounded-md flex items-center justify-center mt-4">
                <Plus size={18} className="mr-2" /> Add New Vendor Pass
              </Button>
            </div>
          ) : ( 
            /* Add/Edit Vendor Pass Form */
            <div className="space-y-4">
              <h4 className="text-md font-semibold mb-2 text-white">{editingVendorPass ? 'Edit Vendor Pass' : 'Add New Vendor Pass'}</h4>
              <div>
                <Label htmlFor="vendorPassName" className="block text-xs font-medium text-gray-300 mb-1">Pass Name</Label>
                <Input 
                  id="vendorPassName" 
                  type="text" 
                  value={newVendorPass.name} 
                  onChange={(e) => setNewVendorPass({...newVendorPass, name: e.target.value})} 
                  placeholder="Standard Vendor Stall"
                  className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vendorPassPrice" className="block text-xs font-medium text-gray-300 mb-1">Price ({currency})</Label>
                  <Input 
                    id="vendorPassPrice" 
                    type="number" 
                    value={newVendorPass.price}
                    onChange={(e) => setNewVendorPass({...newVendorPass, price: e.target.value})} 
                    placeholder="0.00"
                    className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500"
                  />
                </div>
                <div>
                  <Label htmlFor="vendorPassQuantity" className="block text-xs font-medium text-gray-300 mb-1">Quantity</Label>
                  <Input 
                    id="vendorPassQuantity" 
                    type="number" 
                    value={newVendorPass.quantity}
                    onChange={(e) => setNewVendorPass({...newVendorPass, quantity: e.target.value})} 
                    placeholder="Unlimited" 
                    disabled={newVendorPass.unlimited}
                    className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500 disabled:opacity-50"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between">
                  <Label htmlFor="vendorPassUnlimitedQuantity" className="text-xs text-gray-300">Unlimited Quantity</Label>
                  <Switch 
                    id="vendorPassUnlimitedQuantity" 
                    checked={newVendorPass.unlimited} 
                    onCheckedChange={(checked) => setNewVendorPass({...newVendorPass, unlimited: checked, quantity: checked ? 'Unlimited' : ''})} 
                    className="data-[state=checked]:bg-red-500"
                  />
              </div>
              <div>
                <Label htmlFor="vendorPassDescription" className="block text-xs font-medium text-gray-300 mb-1">Description (Optional)</Label>
                <Textarea 
                  id="vendorPassDescription" 
                  value={newVendorPass.description || ''}
                  onChange={(e) => setNewVendorPass({...newVendorPass, description: e.target.value})} 
                  placeholder="Details about the vendor pass, e.g., stall size, location"
                  className="bg-[#333333] border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-red-500 h-20"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowVendorPassForm(false)} className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white">
                  Cancel
                </Button>
                <Button type="button" onClick={editingVendorPass ? handleUpdateVendorPass : handleAddVendorPass} className="bg-[#F96521] hover:bg-[#E05A1F] text-white">
                  {isSubmitting ? <Spinner size="sm" /> : (editingVendorPass ? 'Save Pass' : 'Add Pass')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-[#2A2A2A] rounded-lg p-6 mt-6">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="refundPolicyEnabled" className="text-base font-medium text-white">
              Refund Policy <span className="text-xs text-gray-400">(Optional)</span>
            </Label>
            <p className="text-xs text-gray-400">Set refund policies for your event.</p>
          </div>
          <Switch
            id="refundPolicyEnabled"
            checked={refundPolicyEnabled}
            onCheckedChange={setRefundPolicyEnabled}
            className="data-[state=checked]:bg-red-500"
          />
        </div>
        {refundPolicyEnabled && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-300">
              When enabled, a standard refund policy will apply to your event tickets. You can specify further details in your event description if needed.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-between mt-10">
        <Button type="button" variant="outline" onClick={onBack} className="text-gray-300 border-gray-600 hover:bg-gray-700 hover:text-white">
          Previous
        </Button>
        <Button type="button" onClick={onNext} className="bg-[#F96521] hover:bg-[#E05A1F] text-white">
          {isSubmitting ? <Spinner /> : 'Next'}
        </Button>
      </div>
    </div>
  );
};

export default TicketStep;
