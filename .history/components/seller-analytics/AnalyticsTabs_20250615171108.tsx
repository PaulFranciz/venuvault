"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartBarIcon, LineChart, PieChart, BarChart } from "lucide-react";
import AnalyticsSummaryCards from "./AnalyticsSummaryCards";
import RevenueChart from "./RevenueChart";
import EventPerformanceTable from "./EventPerformanceTable";
import TicketDistributionChart from "./TicketDistributionChart";


interface EventWithMetrics {
  _id: string;
  name: string;
  eventDate: number;
  totalTickets: number;
  is_cancelled?: boolean;
  ticketTypes?: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    remaining: number;
  }>;
  metrics: {
    soldTickets: number;
    refundedTickets: number;
    cancelledTickets: number;
    revenue: number;
  };
}

interface AnalyticsTabsProps {
  events: EventWithMetrics[];
  totalEvents: number;
  totalSales: number;
  totalRevenue: number;
  totalRefunds: number;
  period: string;
}

export default function AnalyticsTabs({
  events,
  totalEvents,
  totalSales,
  totalRevenue,
  totalRefunds,
  period,
}: AnalyticsTabsProps) {
  const [activeTab, setActiveTab] = useState("overview");

  // Check if we have enough data for advanced analytics
  const hasTicketTypeData = events.some(event => 
    event.ticketTypes && event.ticketTypes.length > 1
  );
  
  const hasMultipleEvents = events.length > 1;
  const hasCompletedEvents = events.some(event => 
    event.eventDate < Date.now() && event.metrics.soldTickets > 0
  );

  return (
    <Tabs
      defaultValue="overview"
      className="w-full"
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <TabsList className="grid w-full grid-cols-4 mb-8 bg-white border border-gray-200">
        <TabsTrigger value="overview" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
          <ChartBarIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="sales" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
          <LineChart className="h-4 w-4" />
          <span className="hidden sm:inline">Sales</span>
        </TabsTrigger>
        <TabsTrigger value="tickets" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
          <PieChart className="h-4 w-4" />
          <span className="hidden sm:inline">Tickets</span>
        </TabsTrigger>
        <TabsTrigger value="events" className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
          <BarChart className="h-4 w-4" />
          <span className="hidden sm:inline">Events</span>
        </TabsTrigger>
      </TabsList>

      {/* Overview Tab - Shows all main analytics */}
      <TabsContent value="overview" className="space-y-6">
        <AnalyticsSummaryCards
          totalEvents={totalEvents}
          totalSales={totalSales}
          totalRevenue={totalRevenue}
          totalRefunds={totalRefunds}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <RevenueChart events={events} period={period} />
          <TicketDistributionChart events={events} />
        </div>
        <EventPerformanceTable events={events} />
      </TabsContent>

      {/* Sales Tab - Focused on revenue and velocity */}
      <TabsContent value="sales" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="md:col-span-2 lg:col-span-4">
            <RevenueChart events={events} period={period} />
          </div>
        </div>
        <SalesVelocityChart velocityData={mockVelocityData} />
      </TabsContent>

      {/* Tickets Tab - Focused on ticket analytics */}
      <TabsContent value="tickets" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <TicketDistributionChart events={events} />
          </div>
        </div>
        <TicketTypePerformance ticketTypes={mockTicketTypes} />
        <CheckInAnalytics checkInData={mockCheckInData} />
      </TabsContent>

      {/* Events Tab - Event comparison */}
      <TabsContent value="events" className="space-y-6">
        <EventPerformanceTable events={events} />
        <EventComparison events={mockEventMetrics} />
      </TabsContent>
    </Tabs>
  );
}
