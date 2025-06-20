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

  return (
    <Tabs
      defaultValue="overview"
      className="w-full"
      value={activeTab}
      onValueChange={setActiveTab}
    >
      <TabsList className="grid w-full grid-cols-4 mb-8">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <ChartBarIcon className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="sales" className="flex items-center gap-2">
          <LineChart className="h-4 w-4" />
          <span className="hidden sm:inline">Sales</span>
        </TabsTrigger>
        <TabsTrigger value="tickets" className="flex items-center gap-2">
          <PieChart className="h-4 w-4" />
          <span className="hidden sm:inline">Tickets</span>
        </TabsTrigger>
        <TabsTrigger value="events" className="flex items-center gap-2">
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
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Coming Soon: Advanced Sales Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-indigo-100 p-2 rounded-full">
                <LineChart className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-medium">Sales Forecasting</h4>
                <p className="text-sm text-gray-500">
                  Predict future ticket sales based on historical data and trends
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-emerald-100 p-2 rounded-full">
                <BarChart className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-medium">Conversion Funnels</h4>
                <p className="text-sm text-gray-500">
                  Track visitor-to-buyer conversion rates at each step
                </p>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Tickets Tab - Focused on ticket distribution */}
      <TabsContent value="tickets" className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <TicketDistributionChart events={events} />
          </div>
        </div>
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Coming Soon: Ticket Analytics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-purple-100 p-2 rounded-full">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium">Ticket Type Performance</h4>
                <p className="text-sm text-gray-500">
                  Compare performance across different ticket types and price points
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-amber-100 p-2 rounded-full">
                <ChartBarIcon className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h4 className="font-medium">Check-In Analytics</h4>
                <p className="text-sm text-gray-500">
                  Analyze attendance rates and check-in patterns
                </p>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* Events Tab - Event comparison */}
      <TabsContent value="events" className="space-y-6">
        <EventPerformanceTable events={events} />
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
          <h3 className="text-lg font-semibold mb-4">Coming Soon: Event Comparisons</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="bg-rose-100 p-2 rounded-full">
                <BarChart className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h4 className="font-medium">Event Comparison</h4>
                <p className="text-sm text-gray-500">
                  Compare performance across multiple events with side-by-side metrics
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-cyan-100 p-2 rounded-full">
                <LineChart className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h4 className="font-medium">Sales Velocity</h4>
                <p className="text-sm text-gray-500">
                  Track how quickly tickets sell over time for each event
                </p>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
