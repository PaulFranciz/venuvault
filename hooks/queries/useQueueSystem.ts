"use client";

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
// Remove direct import of server function
// import { createQStashPublicClient } from '@/lib/qstash';

// Types for queue operations
export type TicketReservationParams = {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
};

export type JobStatus = {
  id: string;
  state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  result: any;
  error: string | null;
  timestamp: number;
  // QStash specific fields
  qstashMessageId?: string;
  processingPath?: 'bullmq' | 'qstash' | 'both';
};

/**
 * Hook for interacting with the background processing queue system
 */
export function useQueueSystem() {
  const queryClient = useQueryClient();
  const [activeJobs, setActiveJobs] = useState<Record<string, string>>({});
  const [qstashJobs, setQStashJobs] = useState<Record<string, string>>({});
  
  // Use API routes instead of direct server function calls
  // const qstashClient = createQStashPublicClient();

  // Mutation for reserving tickets through the queue with redundant processing
  const reserveTicket = useMutation({
    mutationFn: async (params: TicketReservationParams) => {
      // Primary path: BullMQ
      const response = await fetch('/api/queue/reserve-ticket', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reserve ticket');
      }
      
      const primaryResult = await response.json();
      
      // Secondary path: QStash (as a fallback with delay)
      try {
        // Submit to QStash with the BullMQ job ID for deduplication
        const backupResponse = await fetch('/api/qstash/backup-reservation', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...params,
            bullmqJobId: primaryResult.jobId, // Include BullMQ job ID for deduplication
          }),
        });
        
        if (backupResponse.ok) {
          const qstashResult = await backupResponse.json();
          
          // Store QStash message ID for tracking
          if (qstashResult.messageId) {
            setQStashJobs(prev => ({
              ...prev,
              [primaryResult.jobId]: qstashResult.messageId
            }));
            
            // Return combined result
            return {
              ...primaryResult,
              qstashMessageId: qstashResult.messageId,
              processingPath: 'both'
            };
          }
        }
      } catch (qstashError) {
        // Log error but don't fail the mutation since BullMQ path succeeded
        console.error('QStash backup failed:', qstashError);
      }
      
      return {
        ...primaryResult,
        processingPath: 'bullmq'
      };
    },
    onSuccess: (data) => {
      toast.success(data.processingPath === 'both' 
        ? 'Ticket reservation in progress (redundant processing)' 
        : 'Ticket reservation in progress');
      
      // Add job to active jobs list
      if (data.jobId) {
        setActiveJobs(prev => ({
          ...prev,
          [data.jobId]: 'ticketReservation'
        }));
        
        // Start polling for job status
        queryClient.prefetchQuery({
          queryKey: ['jobStatus', data.jobId, 'ticketReservation'],
          queryFn: () => checkJobStatus(data.jobId, 'ticketReservation'),
          staleTime: 0, // Always refetch
        });
      }
    },
    onError: (error) => {
      toast.error(`Reservation failed: ${error.message}`);
    }
  });

  // Query for checking job status with fallback to QStash
  const checkJobStatus = async (jobId: string, queueName: string): Promise<JobStatus> => {
    try {
      // First try to get status from BullMQ
      const response = await fetch(`/api/queue/job-status?jobId=${jobId}&queue=${queueName}`);
      
      if (!response.ok) {
        throw new Error('BullMQ status check failed');
      }
      
      const status = await response.json();
      
      // If job is not completed or failed, and we have a QStash backup, check that too
      if ((status.state === 'waiting' || status.state === 'delayed') && qstashJobs[jobId]) {
        try {
          // Check QStash message status via API route instead
          const qstashResponse = await fetch(`/api/qstash/message-status?id=${qstashJobs[jobId]}`);
          if (!qstashResponse.ok) throw new Error('QStash status check failed');
          const qstashStatus = await qstashResponse.json();
          
          // If QStash job completed successfully but BullMQ is still waiting,
          // consider the job as completed through the QStash path
          if (qstashStatus.status === 'completed' || qstashStatus.status === 'processed') {
            const enhancedStatus = {
              ...status,
              state: 'completed' as const,
              result: { ...status.result, completedByQStash: true },
              processingPath: 'qstash' as const
            };
            
            // Handle completion via QStash
            handleJobCompletion(jobId, enhancedStatus);
            return enhancedStatus;
          }
        } catch (qstashError) {
          console.error('QStash status check failed:', qstashError);
          // Continue with BullMQ status only
        }
      }
      
      // Handle BullMQ job completion/failure
      if (status.state === 'completed' || status.state === 'failed') {
        handleJobCompletion(jobId, status);
      }
      
      return status;
    } catch (error) {
      // If BullMQ status check fails and we have a QStash backup, try to get status from QStash
      if (qstashJobs[jobId]) {
        try {
          const qstashResponse = await fetch(`/api/qstash/message-status?id=${qstashJobs[jobId]}`);
          if (!qstashResponse.ok) throw new Error('QStash status check failed');
          const qstashStatus = await qstashResponse.json();
          
          if (qstashStatus.status === 'completed' || qstashStatus.status === 'processed') {
            const status: JobStatus = {
              id: jobId,
              state: 'completed',
              progress: 100,
              result: { completedByQStash: true },
              error: null,
              timestamp: Date.now(),
              qstashMessageId: qstashJobs[jobId],
              processingPath: 'qstash'
            };
            
            // Handle completion via QStash
            handleJobCompletion(jobId, status);
            return status;
          }
          
          // QStash job is still in progress
          return {
            id: jobId,
            state: 'waiting',
            progress: 0,
            result: null,
            error: null,
            timestamp: Date.now(),
            qstashMessageId: qstashJobs[jobId],
            processingPath: 'qstash'
          };
        } catch (qstashError) {
          console.error('QStash fallback status check failed:', qstashError);
        }
      }
      
      // Both BullMQ and QStash status checks failed
      throw error;
    }
  };
  
  // Helper function to handle job completion or failure
  const handleJobCompletion = (jobId: string, status: JobStatus) => {
    // Remove from active jobs
    setActiveJobs(prev => {
      const newJobs = { ...prev };
      delete newJobs[jobId];
      return newJobs;
    });
    
    // Remove from QStash jobs if present
    if (qstashJobs[jobId]) {
      setQStashJobs(prev => {
        const newJobs = { ...prev };
        delete newJobs[jobId];
        return newJobs;
      });
    }
    
    // Show appropriate toast
    if (status.state === 'completed') {
      const viaQStash = status.processingPath === 'qstash' || (status.result && status.result.completedByQStash);
      toast.success(viaQStash 
        ? 'Ticket reservation successful (processed by backup system)' 
        : 'Ticket reservation successful');
        
      // Invalidate relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['userTickets'] });
      queryClient.invalidateQueries({ queryKey: ['eventAvailability'] });
    } else {
      toast.error(`Reservation failed: ${status.error || 'Unknown error'}`);
    }
  };

  // Hook for tracking a specific job
  const useJobStatus = (jobId?: string, queueName?: string) => {
    return useQuery({
      queryKey: ['jobStatus', jobId, queueName],
      queryFn: () => checkJobStatus(jobId!, queueName!),
      enabled: !!jobId && !!queueName,
      refetchInterval: (data) => {
        // Refetch frequently if job is still in progress
        if (data?.state === 'waiting' || data?.state === 'active' || data?.state === 'delayed') {
          return 1000; // Check every second
        }
        return false; // Stop polling once completed or failed
      },
    });
  };

  return {
    reserveTicket,
    useJobStatus,
    activeJobs,
    qstashJobs,
  };
}
