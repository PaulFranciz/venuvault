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

      {/* Sales Tab - Focused on revenue */}
      <TabsContent value="sales" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="md:col-span-2 lg:col-span-4">
            <RevenueChart events={events} period={period} />
          </div>
        </div>
        
        {/* Sales Velocity - Coming Soon */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Sales Velocity Tracking</h3>
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <LineChart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-medium text-blue-800">Advanced Sales Analytics</h4>
              <p className="text-sm text-blue-700">
                Track daily sales velocity, projections, and trends over time
              </p>
            </div>
          </div>
          <p className="text-sm text-blue-600">
            This feature will be available once you have more sales data and multiple events.
          </p>
        </div>
      </TabsContent>

      {/* Tickets Tab - Focused on ticket distribution */}
      <TabsContent value="tickets" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <TicketDistributionChart events={events} />
          </div>
        </div>
        
        {/* Ticket Type Performance - Conditional */}
        {hasTicketTypeData ? (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Ticket Type Performance</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-2 rounded-full">
                <PieChart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-800">Multi-Tier Ticket Analytics</h4>
                <p className="text-sm text-green-700">
                  Compare performance across different ticket types and price points
                </p>
              </div>
            </div>
            <p className="text-sm text-green-600">
              Advanced ticket type analytics will be available in a future update.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ticket Type Performance</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gray-100 p-2 rounded-full">
                <PieChart className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Multi-Tier Ticket Analytics</h4>
                <p className="text-sm text-gray-600">
                  Create events with multiple ticket types to unlock detailed performance analytics
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Check-In Analytics - Conditional */}
        {hasCompletedEvents ? (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Check-In Analytics</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-2 rounded-full">
                <ChartBarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-800">Attendance Insights</h4>
                <p className="text-sm text-green-700">
                  Analyze attendance rates and check-in patterns from your completed events
                </p>
              </div>
            </div>
            <p className="text-sm text-green-600">
              Detailed check-in analytics will be available in a future update.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-In Analytics</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gray-100 p-2 rounded-full">
                <ChartBarIcon className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Attendance Insights</h4>
                <p className="text-sm text-gray-600">
                  Complete some events and use the check-in feature to unlock attendance analytics
                </p>
              </div>
            </div>
          </div>
        )}
      </TabsContent>

      {/* Events Tab - Event comparison */}
      <TabsContent value="events" className="space-y-6">
        <EventPerformanceTable events={events} />
        
        {/* Event Comparison - Conditional */}
        {hasMultipleEvents ? (
          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-4">Event Performance Comparison</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-green-100 p-2 rounded-full">
                <BarChart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-green-800">Multi-Event Analytics</h4>
                <p className="text-sm text-green-700">
                  Compare performance across your {events.length} events with side-by-side metrics
                </p>
              </div>
            </div>
            <p className="text-sm text-green-600">
              Advanced event comparison features will be available in a future update.
            </p>
          </div>
        ) : (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Performance Comparison</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-gray-100 p-2 rounded-full">
                <BarChart className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-800">Multi-Event Analytics</h4>
                <p className="text-sm text-gray-600">
                  Create more events to unlock comparative performance analytics
                </p>
              </div>
            </div>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
