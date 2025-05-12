"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import SellerEventList from '@/components/SellerEventList';

const EventManagementPage = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-pally-bold text-slate-800">Event Management</h1>
        <Link href="/seller/events/new" passHref legacyBehavior>
          <Button asChild className="bg-brand-teal hover:bg-brand-teal/90 text-white">
            <a>
              <Plus className="mr-2 h-5 w-5" /> Create New Event
            </a>
          </Button>
        </Link>
      </div>
      
      {/* Display the list of seller events */}
      <SellerEventList />
      
    </div>
  );
};

export default EventManagementPage;
