import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useEventForm } from '@/providers/EventFormProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { CalendarDays, Clock, MapPin, Ticket as TicketIcon, UserCircle, Edit3, Video, Globe, Monitor, RefreshCw, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns'; 
import { detectPlatform } from '@/lib/virtualLinkUtils';
import SchedulePublishModal from './SchedulePublishModal';

interface PreviewStepProps {
  onBack?: () => void;
  onSubmit?: () => void; // Changed to optional
  isSubmitting?: boolean;
  onSchedulePublish?: (scheduleDateTime: Date) => void; // Updated for "Schedule Publish"
}

const PreviewStep: React.FC<PreviewStepProps> = ({ onBack, onSubmit, isSubmitting, onSchedulePublish }) => {
  const { formData } = useEventForm();
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | undefined>(formData.bannerImageUrl);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | undefined>(formData.thumbnailImageUrl);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false); // Added state for modal

  useEffect(() => {
    let bannerUrl: string | undefined;
    if (formData.bannerImage instanceof File) {
      bannerUrl = URL.createObjectURL(formData.bannerImage);
      setBannerPreviewUrl(bannerUrl);
    } else if (formData.bannerImageUrl) {
      setBannerPreviewUrl(formData.bannerImageUrl);
    }

    let thumbnailUrl: string | undefined;
    if (formData.thumbnailImage instanceof File) {
      thumbnailUrl = URL.createObjectURL(formData.thumbnailImage);
      setThumbnailPreviewUrl(thumbnailUrl);
    } else if (formData.thumbnailImageUrl) {
      setThumbnailPreviewUrl(formData.thumbnailImageUrl);
    }

    return () => {
      if (bannerUrl) URL.revokeObjectURL(bannerUrl);
      if (thumbnailUrl) URL.revokeObjectURL(thumbnailUrl);
    };
  }, [formData.bannerImage, formData.thumbnailImage, formData.bannerImageUrl, formData.thumbnailImageUrl]);

  const DetailItem: React.FC<{ icon: React.ElementType; label: string; value?: string }> = ({ icon: Icon, label, value }) => (
    value ? (
      <div className="flex items-start text-sm">
        <Icon className="h-4 w-4 text-gray-400 mr-2.5 mt-0.5 shrink-0" />
        <div>
          <span className="font-medium text-gray-300">{label}:</span>
          <span className="text-gray-200 ml-1">{value}</span>
        </div>
      </div>
    ) : null
  );

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      return format(new Date(dateStr), 'EEEE, MMMM d, yyyy');
    } catch {
      return dateStr; // Fallback if date is invalid
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return 'Not set';
    // Assuming timeStr is like 'HH:mm'
    try {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes);
      return format(date, 'h:mm a');
    } catch {
      return timeStr;
    }
  };
  
  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'zoom':
        return <Video className="h-4 w-4 text-blue-400" />;
      case 'google meet':
        return <Video className="h-4 w-4 text-green-400" />;
      case 'youtube':
        return <Monitor className="h-4 w-4 text-red-400" />;
      default:
        return <Globe className="h-4 w-4 text-purple-400" />;
    }
  };

  const locationString = () => {
    if (formData.locationType === 'virtual') {
      return 'Virtual Event';
    }
    
    const parts = [formData.address, formData.city, formData.state, formData.country, formData.zipCode].filter(Boolean);
    return parts.join(', ') || 'Not set';
  };

  const handleOpenScheduleModal = () => {
    if (onSchedulePublish) { // Check if the prop is provided before opening modal
      setIsScheduleModalOpen(true);
    } else {
      console.warn('onSchedulePublish prop is not provided to PreviewStep');
      // Optionally, show a message to the user or disable the button if the prop isn't there
    }
  };

  const handleConfirmSchedule = (scheduleDateTime: Date) => {
    if (onSchedulePublish) {
      onSchedulePublish(scheduleDateTime);
    }
    setIsScheduleModalOpen(false); // Close modal after confirmation
  };

  return (
    <div className="text-white">
      <h2 className="text-xl font-pally-medium mb-6">Preview & Confirm</h2>
      <div className="bg-[#1A1A1A] rounded-lg p-6 space-y-6">
        
        {/* Event Preview Card */}
        <Card className="bg-[#1E1E1E] border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-pally-bold text-white flex justify-between items-center">
              Event Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bannerPreviewUrl && (
              <div className="aspect-video rounded-md overflow-hidden mb-4 bg-[#2A2A2A]">
                <Image src={bannerPreviewUrl} alt={formData.name || 'Event Banner'} width={800} height={450} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex items-center mb-3">
              <UserCircle className="h-10 w-10 text-gray-400 mr-3 shrink-0" /> {/* Placeholder Avatar */}
              <div>
                <h3 className="font-pally-bold text-lg text-white">{formData.name || 'Event Name Not Set'}</h3>
                <p className="text-sm text-red-400 font-pally-regular">{formData.category || 'Category Not Set'}</p>
              </div>
            </div>
            
            <div className="space-y-2.5 mt-4">
              <DetailItem icon={CalendarDays} label="Date" value={formatDate(formData.startDate)} />
              <DetailItem icon={Clock} label="Time" value={formatTime(formData.startTime)} />
              {formData.locationType === 'virtual' ? (
                <div className="flex items-start text-sm">
                  <Video className="h-4 w-4 text-purple-400 mr-2.5 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-gray-300">Location:</span>
                    <span className="text-gray-200 ml-1">Virtual Event</span>
                    {formData.virtualLink && (
                      <>
                        <Badge className="ml-2 bg-purple-900 text-purple-200 hover:bg-purple-800">
                          Virtual
                        </Badge>
                        <div className="mt-1 flex items-center">
                          {getPlatformIcon(detectPlatform(formData.virtualLink))}
                          <a 
                            href={formData.virtualLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="ml-1.5 text-blue-400 hover:underline text-xs"
                          >
                            {detectPlatform(formData.virtualLink) || 'Virtual Link'}
                          </a>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <DetailItem icon={MapPin} label="Location" value={locationString()} />
              )}
              <DetailItem icon={TicketIcon} label="Tickets" value={`${formData.ticketTypes?.length || 0} ticket type(s)`} />
              
              {/* Recurring Event Info */} 
              {formData.isRecurring && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Recurring Event Details:</h4>
                  <DetailItem icon={RefreshCw} label="Frequency" value={formData.recurringFrequency} />
                  {formData.recurringInterval && <DetailItem icon={Calendar} label="Interval" value={`Every ${formData.recurringInterval} ${formData.recurringFrequency?.replace(/ly$/, '')}(s)`} />}
                  {formData.recurringDaysOfWeek && formData.recurringDaysOfWeek.length > 0 && <DetailItem icon={Calendar} label="Days of Week" value={formData.recurringDaysOfWeek.join(', ')} />}
                  {formData.recurringDayOfMonth && <DetailItem icon={Calendar} label="Day of Month" value={formData.recurringDayOfMonth.toString()} />}
                  {formData.recurringEndDate && <DetailItem icon={Calendar} label="Ends On" value={formatDate(formData.recurringEndDate)} />}
                </div>
              )}

              {/* Display ticket information with free and virtual indicators */}
              {formData.ticketTypes && formData.ticketTypes.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-gray-300 mb-2">Available Tickets:</h4>
                  <div className="space-y-2">
                    {formData.ticketTypes.map((ticket) => (
                      <div key={ticket.id} className="flex items-center justify-between bg-[#272727] p-2 rounded-md">
                        <div>
                          <span className="text-sm text-white">{ticket.name}</span>
                          <div className="flex items-center mt-1">
                            <span className="text-xs text-gray-400">
                              {ticket.isFree 
                                ? 'Free' 
                                : `${formData.currency} ${parseFloat(ticket.price).toFixed(2)}`}
                            </span>
                            {ticket.isFree && (
                              <Badge className="ml-1.5 text-[10px] py-0 px-1.5 bg-green-900 text-green-200">
                                FREE
                              </Badge>
                            )}
                            {formData.locationType === 'virtual' && (
                              <Badge className="ml-1.5 text-[10px] py-0 px-1.5 bg-purple-900 text-purple-200">
                                VIRTUAL
                              </Badge>
                            )}
                            {ticket.recurringEvent && (
                              <Badge className="ml-1.5 text-[10px] py-0 px-1.5 bg-blue-900 text-blue-200">
                                RECURRING
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <div className="text-xs text-gray-400">
                            {ticket.unlimited ? 'Unlimited' : `${ticket.quantity} available`}
                          </div>
                          {ticket.recurringEvent && (
                            <div className="flex items-center mt-1.5">
                              <RefreshCw className="w-3 h-3 text-blue-400 mr-1" />
                              <span className="text-[10px] text-blue-400">
                                {ticket.recurringFrequency === 'daily' && 'Daily'}
                                {ticket.recurringFrequency === 'weekly' && 
                                  `Weekly: ${ticket.recurringDays?.map(day => 
                                    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day]
                                  ).join(', ')}`
                                }
                                {ticket.recurringFrequency === 'monthly' && 
                                  `Monthly: ${ticket.recurringDays?.map(day => day).join(', ')}`
                                }
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Media & Previews Card */}
        {(thumbnailPreviewUrl || bannerPreviewUrl) && (
          <Card className="bg-[#1E1E1E] border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-pally-bold text-white flex justify-between items-center">
                Media & Previews
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {thumbnailPreviewUrl && (
                <div>
                  <Label className="text-xs text-gray-400 mb-1.5 block">Event Thumbnail:</Label>
                  <div className="aspect-square rounded-md overflow-hidden bg-[#2A2A2A] w-full max-w-xs mx-auto md:mx-0">
                    <Image src={thumbnailPreviewUrl} alt={formData.name || 'Event Thumbnail'} width={300} height={300} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
              {bannerPreviewUrl && (
                 <div>
                  <Label className="text-xs text-gray-400 mb-1.5 block">Event Banner:</Label>
                  <div className="aspect-video rounded-md overflow-hidden bg-[#2A2A2A]">
                    <Image src={bannerPreviewUrl} alt={formData.name || 'Event Banner'} width={500} height={281} className="w-full h-full object-cover" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Separator className="bg-gray-700" />

        <div>
          <p className="text-sm text-center text-gray-400 mb-4">Ready to go live? You can always edit details later.</p>
          {/* Scheduling UI will go here in Phase 2 */}
        </div>

      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isSubmitting}
          className="text-white border-gray-600 hover:bg-gray-700"
        >
          Back
        </Button>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleOpenScheduleModal} 
            disabled={isSubmitting} 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Schedule Publish
          </Button>
          <Button
            onClick={onSubmit} // This is the "Publish Now" action
            disabled={isSubmitting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isSubmitting ? 'Publishing...' : 'Publish Now'}
          </Button>
        </div>
      </div>

      {/* Schedule Publish Modal */}
      {onSchedulePublish && (
        <SchedulePublishModal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          onConfirmSchedule={handleConfirmSchedule}
          defaultDateTime={formData.startDate ? new Date(formData.startDate) : undefined} // Optional: pass current event start date as default
        />
      )}
    </div>
  );
};

export default PreviewStep;
