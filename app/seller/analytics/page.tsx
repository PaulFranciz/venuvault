"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowLeft, DownloadIcon } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/seller-dashboard/DashboardLayout";
import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AnalyticsTabs from "@/components/seller-analytics/AnalyticsTabs";

export default function AnalyticsPage() {
  const { user } = useUser();
  const [selectedPeriod, setSelectedPeriod] = useState("all");

  // Get events for the user
  const events = useQuery(api.events.getSellerEvents, {
    userId: user?.id ?? "",
  });

  if (!user) {
    return <div>Please sign in to view your analytics.</div>;
  }

  if (!events) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  // Filter events based on the selected period
  const filteredEvents = events.filter(event => {
    if (selectedPeriod === "all") return true;
    
    const eventDate = new Date(event.eventDate);
    const now = new Date();
    const daysAgo = parseInt(selectedPeriod);
    const cutoffDate = new Date(now.setDate(now.getDate() - daysAgo));
    
    return eventDate >= cutoffDate;
  });

  // Calculate summary statistics from filtered events
  const totalEvents = filteredEvents.length;
  const totalSales = filteredEvents.reduce(
    (sum, event) => sum + event.metrics.soldTickets,
    0
  );
  const totalRevenue = filteredEvents.reduce(
    (sum, event) => sum + event.metrics.revenue,
    0
  );
  const totalRefunds = filteredEvents.reduce(
    (sum, event) => sum + event.metrics.refundedTickets,
    0
  );

  // Generate CSV for export
  const handleExportCSV = () => {
    const headers = [
      "Event Name",
      "Date",
      "Tickets Sold",
      "Total Tickets",
      "Revenue",
      "Refunds",
      "Status"
    ];

    const rows = filteredEvents.map((event) => [
      event.name,
      new Date(event.eventDate).toLocaleDateString(),
      event.metrics.soldTickets,
      event.totalTickets,
      event.metrics.revenue.toFixed(2),
      event.metrics.refundedTickets,
      event.is_cancelled
        ? "Cancelled"
        : event.eventDate < Date.now()
        ? "Past"
        : "Active"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `analytics-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with title and period selector */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-[#F9F6F0] p-6 rounded-lg border border-[#F96521]/20">
          <div className="flex items-center gap-4">
            <Link
              href="/seller"
              className="text-[#F96521]/70 hover:text-[#F96521] transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-[#0C090C]">
                <span className="text-[#F96521]">Sales</span> & Analytics
              </h1>
              <p className="text-[#0C090C]/70">
                Monitor your event performance and revenue
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-md border border-[#F96521]/30 bg-[#F9F6F0] px-3 py-2 text-sm text-[#0C090C] focus:ring-[#F96521] focus:border-[#F96521]/50"
            >
              <option value="all">All Time</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">Last Year</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-[#F96521]/30 text-[#F96521] hover:bg-[#F96521]/10 hover:border-[#F96521]/50"
              onClick={handleExportCSV}
            >
              <DownloadIcon className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Real-time update notice */}
        <div className="bg-[#F96521]/10 border-l-4 border-[#F96521] p-4 flex items-center rounded-r-lg">
          <div className="flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-[#F96521] animate-ping"></div>
          </div>
          <div className="ml-3">
            <p className="text-sm text-[#0C090C]">
              <span className="font-medium text-[#F96521]">Real-time updates:</span> Analytics data refreshes automatically as new ticket sales come in.
            </p>
          </div>
        </div>

        {/* Main analytics content with tabs */}
        <div className="bg-[#F9F6F0] p-6 rounded-lg border border-[#F96521]/20">
          <AnalyticsTabs 
            events={filteredEvents}
            totalEvents={totalEvents}
            totalSales={totalSales}
            totalRevenue={totalRevenue}
            totalRefunds={totalRefunds}
            period={selectedPeriod}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
