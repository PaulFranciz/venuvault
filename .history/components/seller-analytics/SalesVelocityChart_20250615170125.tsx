"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Target, Zap } from "lucide-react";

interface SalesVelocityData {
  eventName: string;
  eventDate: string;
  daysToEvent: number;
  totalTickets: number;
  soldTickets: number;
  dailySales: { date: string; tickets: number; cumulative: number }[];
  averageDailySales: number;
  peakSalesDay: string;
  peakSalesCount: number;
  projectedSellOut: string;
  velocityTrend: 'accelerating' | 'steady' | 'declining';
}

interface SalesVelocityChartProps {
  velocityData: SalesVelocityData[];
}

export default function SalesVelocityChart({ velocityData }: SalesVelocityChartProps) {
  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'accelerating':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Accelerating</Badge>;
      case 'steady':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Steady</Badge>;
      case 'declining':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Declining</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'accelerating':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'steady':
        return <Target className="w-4 h-4 text-blue-600" />;
      case 'declining':
        return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default:
        return <Target className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Zap className="w-5 h-5 text-orange-600" />
          Sales Velocity Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {velocityData.map((event, index) => {
            const salesProgress = (event.soldTickets / event.totalTickets) * 100;
            const daysRemaining = Math.max(0, event.daysToEvent);
            
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{event.eventName}</h3>
                    {getTrendBadge(event.velocityTrend)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {daysRemaining} days remaining
                  </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {getTrendIcon(event.velocityTrend)}
                    </div>
                    <p className="text-sm text-gray-600">Daily Avg</p>
                    <p className="font-semibold text-gray-900">{event.averageDailySales.toFixed(1)}</p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Target className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-sm text-gray-600">Peak Day</p>
                    <p className="font-semibold text-gray-900">{event.peakSalesCount}</p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="text-sm text-gray-600">Projected Sellout</p>
                    <p className="font-semibold text-gray-900">{event.projectedSellOut}</p>
                  </div>

                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-sm text-gray-600">Progress</p>
                    <p className="font-semibold text-gray-900">{salesProgress.toFixed(1)}%</p>
                  </div>
                </div>

                {/* Sales Timeline Visualization */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Sales Activity</h4>
                  <div className="flex gap-1 h-8 bg-gray-100 rounded overflow-hidden">
                    {event.dailySales.slice(-14).map((day, dayIndex) => {
                      const maxSales = Math.max(...event.dailySales.map(d => d.tickets));
                      const height = maxSales > 0 ? (day.tickets / maxSales) * 100 : 0;
                      
                      return (
                        <div
                          key={dayIndex}
                          className="flex-1 bg-blue-500 opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
                          style={{ height: `${height}%`, alignSelf: 'flex-end' }}
                          title={`${day.date}: ${day.tickets} tickets`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>14 days ago</span>
                    <span>Today</span>
                  </div>
                </div>

                {/* Insights */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-medium text-blue-900 mb-1">Velocity Insights</h4>
                  <div className="text-sm text-blue-800">
                    {event.velocityTrend === 'accelerating' && (
                      <p>🚀 Sales are accelerating! Current pace suggests strong demand.</p>
                    )}
                    {event.velocityTrend === 'steady' && (
                      <p>📈 Sales maintaining steady pace. On track for projected targets.</p>
                    )}
                    {event.velocityTrend === 'declining' && (
                      <p>⚠️ Sales velocity declining. Consider promotional strategies.</p>
                    )}
                    <p className="mt-1">
                      Peak sales day was {event.peakSalesDay} with {event.peakSalesCount} tickets sold.
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}