"use server";

import { Client } from '@upstash/qstash';

// Types
export interface QStashMessage {
  id: string;
  body: any;
  url: string;
  deduplicationId?: string;
  delay?: number;
}

// QStash client singleton
let qstashClient: Client | null = null;

/**
 * Get the QStash client instance (create if doesn't exist)
 */
export async function getQStashClient(): Promise<Client> {
  if (!qstashClient) {
    qstashClient = new Client({
      token: process.env.QSTASH_TOKEN || '',
    });
  }
  return qstashClient;
}

/**
 * Send a message to QStash as a backup/redundant job
 * 
 * @param destination The API route to call (e.g., "/api/qstash/reserve-ticket")
 * @param body The message body
 * @param options Additional options like delay and deduplication
 */
export async function sendToQStash(
  destination: string,
  body: any,
  options: {
    delay?: number; // in seconds
    deduplicationId?: string;
    baseUrl?: string;
  } = {}
): Promise<{ messageId: string }> {
  try {
    const client = await getQStashClient();
    // Use a public URL that QStash can reach, not localhost
    // In development, we'll just return success without actually sending to QStash
    // In production, we'll use the Vercel URL or a custom domain
    let baseUrl = options.baseUrl || process.env.VERCEL_URL || '';
    
    // Check if we're running locally
    const isLocalDevelopment = !baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
    
    if (isLocalDevelopment) {
      console.log('Local development detected - QStash cannot reach localhost');
      console.log('In production, this would send a backup request to:', destination);
      console.log('With data:', body);
      
      // Return mock response for local development
      return { messageId: `dev-mock-${Date.now()}` };
    }
    
    // Ensure the URL has a protocol
    if (baseUrl && !baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }
    
    const fullUrl = `${baseUrl}${destination}`;
    
    // Prepare options
    const publishOptions: any = {};
    if (options.delay) {
      publishOptions.delay = options.delay;
    }
    if (options.deduplicationId) {
      publishOptions.deduplicationId = options.deduplicationId;
    }
    
    // Send message
    const result = await client.publishJSON({
      url: fullUrl,
      body,
      ...publishOptions
    });
    
    // Handle different response types from QStash client
    // Extract messageId regardless of which response type is returned
    let messageId = '';
    
    if ('messageId' in result) {
      messageId = result.messageId as string;
    } else if ('ids' in result) {
      const ids = result.ids as string[];
      if (ids.length > 0) {
        messageId = ids[0];
      }
    }
    
    return { messageId };
  } catch (error) {
    console.error('QStash send error:', error);
    throw error;
  }
}

/**
 * Verify a QStash signature for incoming webhooks
 * 
 * This should be used as a middleware or in API routes
 * 
 * @param signature The signature from request headers
 * @param body The raw request body
 * @returns Whether the signature is valid
 */
export async function verifyQStashSignature(
  signature: string,
  body: string | Buffer
): Promise<boolean> {
  if (!signature) return false;
  
  try {
    const client = await getQStashClient();
    // Use the appropriate method for signature verification from @upstash/qstash
    // For newer versions use verifySignature, but we'll use a type-safe approach
    // that works regardless of which method is available
    if ('verifySignature' in client) {
      return await (client as any).verifySignature({
        signature,
        body,
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
      });
    } else {
      // Fallback to the older verify method if verifySignature isn't available
      return await (client as any).verify({
        signature,
        body,
        currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
        nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
      });
    }
  } catch (error) {
    console.error('QStash verification error:', error);
    return false;
  }
}

/**
 * Create a QStash client for the browser (public API)
 * 
 * This is used to check job status from the client side
 */
export async function createQStashPublicClient() {
  return {
    async checkMessage(messageId: string): Promise<any> {
      try {
        const response = await fetch(`/api/qstash/message-status?id=${messageId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch message status');
        }
        return response.json();
      } catch (error) {
        console.error('QStash message check error:', error);
        throw error;
      }
    }
  };
}
