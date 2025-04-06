'use client';

import { useParams } from 'next/navigation';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle, XCircle, Calendar, MapPin, User, Ticket, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { TICKET_STATUS } from '@/convex/constants'; // Import your constants
import { Button } from '@/components/ui/button'; // Import Button
import { useState } from 'react'; // Import useState
import { toast } from 'sonner'; // Import toast for feedback

// --- Helper Components ---
const LoadingSkeleton = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <Card className="w-full max-w-md">
      <CardHeader>
        <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-5 w-full mt-4" />
        <Skeleton className="h-5 w-1/2" />
      </CardContent>
    </Card>
  </div>
);

const StatusIcon = ({ status, isCancelled }: { status: string | undefined | null, isCancelled: boolean | undefined }) => {
  if (isCancelled) {
    return <XCircle className="w-16 h-16 text-gray-500 mb-4" aria-label="Event Cancelled" />;
  }
  if (status === TICKET_STATUS.VALID) {
    return <CheckCircle className="w-16 h-16 text-green-500 mb-4" aria-label="Valid Ticket" />;
  }
  if (status === TICKET_STATUS.USED) {
    return <AlertCircle className="w-16 h-16 text-orange-500 mb-4" aria-label="Ticket Already Used" />;
  }
  // Default to invalid/error if status is unknown or ticket not found
  return <XCircle className="w-16 h-16 text-red-500 mb-4" aria-label="Invalid Ticket" />;
};

const StatusMessage = ({ status, isCancelled }: { status: string | undefined | null, isCancelled: boolean | undefined }) => {
  if (isCancelled) {
    return <h1 className="text-2xl font-bold text-gray-600 mb-1">Event Cancelled</h1>;
  }
  if (status === TICKET_STATUS.VALID) {
    return <h1 className="text-2xl font-bold text-green-600 mb-1">Ticket Valid</h1>;
  }
  if (status === TICKET_STATUS.USED) {
    return <h1 className="text-2xl font-bold text-orange-600 mb-1">Ticket Already Used</h1>;
  }
  return <h1 className="text-2xl font-bold text-red-600 mb-1">Ticket Invalid or Not Found</h1>;
};

// --- Main Page Component ---
export default function ValidateTicketPage() {
  const params = useParams();
  const [isUpdating, setIsUpdating] = useState(false);
  const ticketIdParam = params.ticketId as string;
  let ticketId: Id<"tickets"> | null = null;

  try {
     if (ticketIdParam && typeof ticketIdParam === 'string') {
         ticketId = ticketIdParam as Id<"tickets">;
     }
  } catch (e) {
      console.error("Invalid ticket ID format in URL", e);
  }

  const ticketDetails = useQuery(
    api.tickets.getTicketDetailsForValidation,
    ticketId ? { ticketId } : 'skip'
  );

  const updateTicketStatus = useMutation(api.tickets.updateTicketStatus);

  const isLoading = ticketDetails === undefined;
  const isValidTicketId = ticketId !== null;

  const handleMarkAsUsed = async () => {
    if (!ticketId || !ticketDetails || ticketDetails.ticket.status !== TICKET_STATUS.VALID || isUpdating) {
      return;
    }
    setIsUpdating(true);
    try {
      await updateTicketStatus({ ticketId: ticketId, status: TICKET_STATUS.USED });
      toast.success("Ticket marked as used!");
      // No need to manually refetch, useQuery will update automatically
    } catch (error) {
      console.error("Failed to mark ticket as used:", error);
      toast.error("Failed to update ticket status.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && isValidTicketId) {
    return <LoadingSkeleton />;
  }

  const data = ticketDetails;
  const ticketStatus = data?.ticket?.status;
  const eventCancelled = data?.event?.is_cancelled ?? false;
  const canMarkAsUsed = isValidTicketId && data && ticketStatus === TICKET_STATUS.VALID && !eventCancelled;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <Card className="w-full max-w-md shadow-lg overflow-hidden">
        <CardHeader className="text-center bg-gray-800 text-white py-4">
             <Ticket className="w-8 h-8 mx-auto mb-2 text-gray-300" />
           <CardTitle className="text-xl tracking-wide">Ticket Validation</CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-8 px-6 text-center">
          <StatusIcon status={ticketStatus} isCancelled={eventCancelled}/>
          <StatusMessage status={ticketStatus} isCancelled={eventCancelled}/>

          {data && (
            <div className="mt-6 text-left space-y-3 text-gray-700">
              <div className="flex items-center">
                  <Ticket className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <span className="break-all">ID: {data.ticket._id}</span>
              </div>
              <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <span>{data.event.name}</span>
              </div>
              <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <span>{data.event.location}</span>
              </div>
              <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <span>{format(new Date(data.event.eventDate), 'PPP p')}</span>
              </div>
               <div className="flex items-center pt-2 border-t mt-3">
                  <User className="w-5 h-5 mr-3 text-gray-500 flex-shrink-0" />
                  <span>{data.user.name} ({data.user.email})</span>
              </div>
            </div>
          )}

          {(!isValidTicketId || (!isLoading && !data && isValidTicketId)) && (
             <p className="mt-6 text-red-600">Could not retrieve details for this ticket ID.</p>
          )}

          {eventCancelled && (
              <p className="mt-4 text-sm text-gray-500">This event has been cancelled.</p>
          )}
          {ticketStatus === TICKET_STATUS.USED && (
              <p className="mt-4 text-sm text-orange-500">This ticket has already been checked in.</p>
          )}

          {canMarkAsUsed && (
              <Button
                  onClick={handleMarkAsUsed}
                  disabled={isUpdating}
                  className="mt-6 w-full bg-green-600 hover:bg-green-700"
              >
                  {isUpdating ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                      'Mark Ticket as Used'
                  )}
              </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 