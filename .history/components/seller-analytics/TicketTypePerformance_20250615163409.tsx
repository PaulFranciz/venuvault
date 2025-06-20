"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Ticket } from "lucide-react";

interface TicketType {
  name: string;
  totalSold: number;
  totalAvailable: number;
  revenue: number;
  averagePrice: number;
  conversionRate: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
}

interface TicketTypePerformanceProps {
  ticketTypes: TicketType[];
}

export default function TicketTypePerformance({ ticketTypes }: TicketTypePerformanceProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Ticket className="w-5 h-5 text-blue-600" />
          Ticket Type Performance
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {ticketTypes.map((ticketType, index) => {
            const soldPercentage = (ticketType.totalSold / ticketType.totalAvailable) * 100;
            
            return (
              <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{ticketType.name}</h3>
                    <Badge variant="outline" className="text-xs">
                      {ticketType.totalSold}/{ticketType.totalAvailable} sold
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(ticketType.trend)}
                    <span className={`text-sm font-medium ${getTrendColor(ticketType.trend)}`}>
                      {ticketType.trendPercentage > 0 ? '+' : ''}{ticketType.trendPercentage}%
                    </span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Sales Progress</span>
                    <span>{soldPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={soldPercentage} className="h-2" />
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Revenue</p>
                    <p className="font-semibold text-gray-900">£{ticketType.revenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avg Price</p>
                    <p className="font-semibold text-gray-900">£{ticketType.averagePrice}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Conversion</p>
                    <p className="font-semibold text-gray-900">{ticketType.conversionRate}%</p>
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