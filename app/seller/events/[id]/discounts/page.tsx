"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { Id } from '@/convex/_generated/dataModel';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import DiscountCodeManager from '@/components/discount/DiscountCodeManager';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

const DiscountsPage = () => {
  const params = useParams<{ id: string }>();
  const eventId = params.id as unknown as Id<"events">;
  
  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'Dashboard', href: '/seller' },
          { label: 'Events', href: '/seller/events' },
          { label: 'Event Details', href: `/seller/events/${params.id}` },
          { label: 'Discount Codes', href: `/seller/events/${params.id}/discounts` },
        ]}
      />
      
      <div className="flex items-center mb-6 mt-4">
        <Link 
          href={`/seller/events/${params.id}`}
          className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back to Event
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Discount Codes</h1>
      </div>
      
      <DiscountCodeManager eventId={eventId} />
    </div>
  );
};

export default DiscountsPage;