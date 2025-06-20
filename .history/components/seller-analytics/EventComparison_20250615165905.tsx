"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, TrendingDown, Calendar, Users, DollarSign } from "lucide-react";

interface EventMetrics {
  id: string;
  name: string;
  date: string;
  totalTickets: number;
  soldTickets: number;
  revenue: number;
  attendanceRate: number;
  salesVelocity: number; // tickets per day
  conversionRate: number;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface EventComparisonProps {
  events: EventMetrics[];
}

export default function EventComparison({ events }: EventComparisonProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'ongoing':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Ongoing</Badge>;
      case 'upcoming':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Upcoming</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPerformanceIcon = (value: number, average: number) => {
    if (value > average * 1.1) return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (value < average * 0.9) return <TrendingDown className="w-4 h-4 text-red-600" />;
    return null;
  };

  // Calculate averages for comparison
  const averages = events.reduce(
    (acc, event) => {
      acc.revenue += event.revenue;
      acc.salesVelocity += event.salesVelocity;
      acc.conversionRate += event.conversionRate;
      acc.attendanceRate += event.attendanceRate;
      return acc;
    },
    { revenue: 0, salesVelocity: 0, conversionRate: 0, attendanceRate: 0 }
  );

  const eventCount = events.length;
  if (eventCount > 0) {
    averages.revenue /= eventCount;
    averages.salesVelocity /= eventCount;
    averages.conversionRate /= eventCount;
    averages.attendanceRate /= eventCount;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <BarChart3 className="w-5 h-5 text-purple-600" />
          Event Performance Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Comparison Grid */}
        <div className="space-y-6">
          {events.map((event, index) => {
            const salesProgress = (event.soldTickets / event.totalTickets) * 100;
            
            return (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{event.name}</h3>
                    {getStatusBadge(event.status)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                </div>

                {/* Sales Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Ticket Sales Progress</span>
                    <span>{event.soldTickets}/{event.totalTickets} ({salesProgress.toFixed(1)}%)</span>
                  </div>
                  <Progress value={salesProgress} className="h-2" />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="w-4 h-4 text-gray-600" />
                      {getPerformanceIcon(event.revenue, averages.revenue)}
                    </div>
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="font-semibold text-gray-900">£{event.revenue.toLocaleString()}</p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-4 h-4 text-gray-600" />
                      {getPerformanceIcon(event.salesVelocity, averages.salesVelocity)}
                    </div>
                    <p className="text-sm text-gray-600">Sales Velocity</p>
                    <p className="font-semibold text-gray-900">{event.salesVelocity}/day</p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Users className="w-4 h-4 text-gray-600" />
                      {getPerformanceIcon(event.conversionRate, averages.conversionRate)}
                    </div>
                    <p className="text-sm text-gray-600">Conversion</p>
                    <p className="font-semibold text-gray-900">{event.conversionRate}%</p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Calendar className="w-4 h-4 text-gray-600" />
                      {getPerformanceIcon(event.attendanceRate, averages.attendanceRate)}
                    </div>
                    <p className="text-sm text-gray-600">Attendance</p>
                    <p className="font-semibold text-gray-900">{event.attendanceRate}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-blue-900 mb-3">Portfolio Averages</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <p className="text-blue-700">Avg Revenue</p>
              <p className="font-semibold text-blue-900">£{averages.revenue.toLocaleString()}</p>
            </div>
            <div className="text-center">
              <p className="text-blue-700">Avg Sales Velocity</p>
              <p className="font-semibold text-blue-900">{averages.salesVelocity.toFixed(1)}/day</p>
            </div>
            <div className="text-center">
              <p className="text-blue-700">Avg Conversion</p>
              <p className="font-semibold text-blue-900">{averages.conversionRate.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-blue-700">Avg Attendance</p>
              <p className="font-semibold text-blue-900">{averages.attendanceRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}