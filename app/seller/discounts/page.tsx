"use client";

import React from 'react';
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Tag } from "lucide-react";

// Since this is a Server Component by default, we'll get events data server-side
export default function DiscountCodesPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Discount Codes</h1>
          <p className="text-muted-foreground">
            Create and manage discount codes for your events
          </p>
        </div>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <p className="text-lg mb-6">
          Select an event to manage its discount codes. You can create, edit, and track usage of discount codes for each event.
        </p>
        
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-brand-teal" />
              <div>
                <p className="font-medium">Event-specific Discount Codes</p>
                <p className="text-sm text-gray-500">Manage discount codes for individual events</p>
              </div>
            </div>
            <Button asChild>
              <Link href="/seller/events">
                Go to Events
              </Link>
            </Button>
          </div>
          
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <Tag className="h-5 w-5 text-brand-teal" />
              <div>
                <p className="font-medium">Discount Code Best Practices</p>
                <p className="text-sm text-gray-500">Learn how to effectively use discount codes</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <Link href="/help/discount-codes">
                View Guide
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 