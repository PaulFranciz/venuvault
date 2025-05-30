"use client";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { TrendingUp, Users, Calendar, DollarSign } from "lucide-react";

interface AnalyticsSummaryCardsProps {
  totalEvents: number;
  totalSales: number;
  totalRevenue: number;
  totalRefunds: number;
}

export default function AnalyticsSummaryCards({
  totalEvents,
  totalSales,
  totalRevenue,
  totalRefunds
}: AnalyticsSummaryCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="bg-[#F9F6F0] border-[#F96521]/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#F96521]/10 rounded-bl-full"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-[#0C090C]/70">
            Total Events
          </CardTitle>
          <Calendar className="h-4 w-4 text-[#F96521]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#F96521]">{totalEvents}</div>
          <p className="text-xs text-[#0C090C]/70 mt-1">
            Events created and managed
          </p>
        </CardContent>
      </Card>
      <Card className="bg-[#F9F6F0] border-[#F96521]/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#F96521]/10 rounded-bl-full"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-[#0C090C]/70">
            Tickets Sold
          </CardTitle>
          <Users className="h-4 w-4 text-[#F96521]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#F96521]">{totalSales}</div>
          <p className="text-xs text-[#0C090C]/70 mt-1">
            Total attendees across events
          </p>
        </CardContent>
      </Card>
      <Card className="bg-[#F9F6F0] border-[#F96521]/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#F96521]/10 rounded-bl-full"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-[#0C090C]/70">
            Total Revenue
          </CardTitle>
          <DollarSign className="h-4 w-4 text-[#F96521]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#F96521]">₦{totalRevenue.toFixed(2)}</div>
          <p className="text-xs text-[#0C090C]/70 mt-1">
            Gross sales before fees
          </p>
        </CardContent>
      </Card>
      <Card className="bg-[#F9F6F0] border-[#F96521]/20 overflow-hidden">
        <div className="absolute top-0 right-0 w-16 h-16 bg-[#F96521]/10 rounded-bl-full"></div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-[#0C090C]/70">
            Refunds
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-[#F96521]" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-[#F96521]">{totalRefunds}</div>
          <p className="text-xs text-[#0C090C]/70 mt-1">
            Tickets refunded to customers
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
