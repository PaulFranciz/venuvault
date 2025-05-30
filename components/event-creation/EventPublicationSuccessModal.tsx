import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Rocket, CalendarClock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EventPublicationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  eventId?: string; // Optional, to navigate to specific event if needed in future
  isScheduled: boolean;
}

const EventPublicationSuccessModal: React.FC<EventPublicationSuccessModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  eventId,
  isScheduled,
}) => {
  const router = useRouter();

  const handleGoToStudio = () => {
    router.push('/seller');
    onClose();
  };

  const handleViewEvent = () => {
    if (eventId) {
      router.push(`/event/${eventId}`);
      onClose();
    } else {
      // Fallback if eventId is not provided, though ideally it should be for direct view
      router.push('/'); 
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            {isScheduled ? (
              <CalendarClock className="h-12 w-12 text-orange-500 mb-4" />
            ) : (
              <Rocket className="h-12 w-12 text-orange-500 mb-4" />
            )}
          </div>
          <DialogTitle className="text-2xl font-bold mb-2">{title}</DialogTitle>
          <DialogDescription className="text-center mt-2">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6 sm:justify-center flex-col sm:flex-row gap-2">
          {!isScheduled && eventId && (
             <Button onClick={handleViewEvent} variant="outline">
              View Event Page
            </Button>
          )}
          <Button onClick={handleGoToStudio} className='bg-orange-500 hover:bg-orange-600 text-white'>
            Go to Dashboard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EventPublicationSuccessModal;
