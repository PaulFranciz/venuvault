"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerOptions {
  timeout?: number;       // Request timeout in ms
  resetTimeout?: number;  // Time before trying again after circuit opens
  maxFailures?: number;   // Number of failures before opening circuit
}

/**
 * Circuit Breaker Pattern Hook
 * 
 * Prevents cascading failures in distributed systems by detecting failures
 * and encapsulating logic of preventing a failure from constantly recurring.
 */
export function useCircuitBreaker(options: CircuitBreakerOptions = {}) {
  const {
    timeout = 5000,
    resetTimeout = 30000,
    maxFailures = 5
  } = options;

  const [status, setStatus] = useState<CircuitState>('closed');
  const failureCount = useRef(0);
  const resetTimer = useRef<NodeJS.Timeout | null>(null);

  // Reset the circuit after resetTimeout
  const resetCircuit = useCallback(() => {
    if (resetTimer.current) {
      clearTimeout(resetTimer.current);
    }
    
    resetTimer.current = setTimeout(() => {
      // Move to half-open state to test if system has recovered
      setStatus('half-open');
      failureCount.current = 0;
    }, resetTimeout);
  }, [resetTimeout]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (resetTimer.current) {
        clearTimeout(resetTimer.current);
      }
    };
  }, []);

  // Execute function with circuit breaker protection
  const execute = useCallback(async <T>(fn: () => Promise<T>): Promise<T> => {
    // If circuit is open, reject immediately
    if (status === 'open') {
      throw new Error('Circuit is open - system under stress');
    }

    try {
      // Create a promise that will timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), timeout);
      });

      // Race between actual function and timeout
      const result = await Promise.race([fn(), timeoutPromise]) as T;

      // On success, reset failure count if in half-open state
      if (status === 'half-open') {
        setStatus('closed');
      }

      return result;
    } catch (error) {
      // Increment failure counter
      failureCount.current += 1;

      // Open circuit if we hit max failures
      if (failureCount.current >= maxFailures || status === 'half-open') {
        setStatus('open');
        resetCircuit();
      }

      throw error;
    }
  }, [status, timeout, maxFailures, resetCircuit]);

  return { status, execute };
}
