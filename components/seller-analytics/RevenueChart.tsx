"use client";

import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface EventWithMetrics {
  _id: string;
  name: string;
  eventDate: number;
  metrics: {
    soldTickets: number;
    refundedTickets: number;
    cancelledTickets: number;
    revenue: number;
  };
}

interface RevenueChartProps {
  events: EventWithMetrics[];
  period: string;
}

export default function RevenueChart({ events, period }: RevenueChartProps) {
  // Process data for chart
  const sortedEvents = [...events].sort((a, b) => a.eventDate - b.eventDate);
  
  // Group events by month/day based on period
  const groupedData = sortedEvents.reduce((acc: any[], event) => {
    const date = new Date(event.eventDate);
    let key: string;
    
    if (period === "7" || period === "30") {
      // Group by day for shorter periods
      key = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } else {
      // Group by month for longer periods
      key = date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
    
    const existingEntry = acc.find(item => item.date === key);
    
    if (existingEntry) {
      existingEntry.revenue += event.metrics.revenue;
      existingEntry.tickets += event.metrics.soldTickets;
    } else {
      acc.push({
        date: key,
        revenue: event.metrics.revenue,
        tickets: event.metrics.soldTickets
      });
    }
    
    return acc;
  }, []);
  
  return (
    <Card className="col-span-1 md:col-span-2 bg-[#F9F6F0] border-[#F96521]/20">
      <CardHeader>
        <CardTitle className="text-[#0C090C]">
          <span className="text-[#F96521]">Revenue</span> Trend
        </CardTitle>
        <CardDescription className="text-[#0C090C]/70">
          Revenue generated over time
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={groupedData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 25,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#F9652120" />
              <XAxis
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fill: '#0C090C' }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => `₦${value}`}
                tick={{ fill: '#0C090C' }}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={(value) => `${value}`}
                tick={{ fill: '#0C090C' }}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#F9F6F0', 
                  borderColor: '#F96521', 
                  borderRadius: '8px' 
                }}
                formatter={(value, name) => {
                  return name === "revenue" 
                    ? [`₦${Number(value).toFixed(2)}`, "Revenue"] 
                    : [value, "Tickets"];
                }}
              />
              <Legend wrapperStyle={{ color: '#0C090C' }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#F96521"
                strokeWidth={2}
                activeDot={{ r: 8, fill: '#F96521' }}
                name="Revenue"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="tickets"
                stroke="#4ADE80"
                strokeWidth={2}
                name="Tickets Sold"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
