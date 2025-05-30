"use client";

import React, { ReactNode } from 'react';
import { QueryProvider } from './QueryProvider';
import { EventFormProvider } from './EventFormProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <EventFormProvider>
        {children}
      </EventFormProvider>
    </QueryProvider>
  );
}
