"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartBarIcon, LineChart, PieChart, BarChart } from "lucide-react";
import AnalyticsSummaryCards from "./AnalyticsSummaryCards";
import RevenueChart from "./RevenueChart";
import EventPerformanceTable from "./EventPerformanceTable";
import TicketDistributionChart from "./TicketDistributionChart";
import TicketTypePerformance from "./TicketTypePerformance";
import CheckInAnalytics from "./CheckInAnalytics";
import EventComparison from "./EventComparison";
import SalesVelocityChart from "./SalesVelocityChart";

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

  // Mock data for the new analytics components
  const mockTicketTypes = [
    {
      name: "General Admission",
      totalSold: 150,
      totalAvailable: 200,
      revenue: 7500,
      averagePrice: 50,
      conversionRate: 12.5,
      trend: 'up' as const,
      trendPercentage: 8.2
    },
    {
      name: "VIP",
      totalSold: 25,
      totalAvailable: 50,
      revenue: 5000,
      averagePrice: 200,
      conversionRate: 8.3,
      trend: 'steady' as const,
      trendPercentage: 2.1
    },
    {
      name: "Early Bird",
      totalSold: 80,
      totalAvailable: 100,
      revenue: 3200,
      averagePrice: 40,
      conversionRate: 15.2,
      trend: 'down' as const,
      trendPercentage: -3.5
    }
  ];

  const mockCheckInData = events.map(event => ({
    eventName: event.name,
    eventDate: new Date(event.eventDate).toISOString(),
    totalTickets: event.totalTickets,
    checkedIn: Math.floor(event.metrics.soldTickets * 0.85), // 85% attendance rate
    attendanceRate: 85,
    peakCheckInTime: "7:30 PM",
    avgCheckInTime: "2.3 min",
    status: event.eventDate > Date.now() ? 'upcoming' : 'completed' as const
  }));

  const mockEventMetrics = events.map(event => ({
    id: event._id,
    name: event.name,
    date: new Date(event.eventDate).toISOString(),
    totalTickets: event.totalTickets,
    soldTickets: event.metrics.soldTickets,
    revenue: event.metrics.revenue,
    attendanceRate: 85,
    salesVelocity: Math.floor(event.metrics.soldTickets / 30), // tickets per day
    conversionRate: 12.5,
    status: event.eventDate > Date.now() ? 'upcoming' : 'completed' as const
  }));

  const mockVelocityData = events.slice(0, 2).map(event => ({
    eventName: event.name,
    eventDate: new Date(event.eventDate).toISOString(),
    daysToEvent: Math.max(0, Math.floor((event.eventDate - Date.now()) / (1000 * 60 * 60 * 24))),
    totalTickets: event.totalTickets,
    soldTickets: event.metrics.soldTickets,
    dailySales: Array.from({ length: 14 }, (_, i) => ({
      date: new Date(Date.now() - (13 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tickets: Math.floor(Math.random() * 20) + 5,
      cumulative: 0
    })),
    averageDailySales: 12.5,
    peakSalesDay: "Monday",
    peakSalesCount: 28,
    projectedSellOut: "Dec 15",
    velocityTrend: 'accelerating' as const
  }));

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
