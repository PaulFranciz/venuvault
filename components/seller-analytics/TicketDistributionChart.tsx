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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
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

interface TicketDistributionChartProps {
  events: EventWithMetrics[];
}

export default function TicketDistributionChart({ events }: TicketDistributionChartProps) {
  // Calculate total ticket distribution
  const soldTickets = events.reduce((sum, event) => sum + event.metrics.soldTickets, 0);
  const refundedTickets = events.reduce((sum, event) => sum + event.metrics.refundedTickets, 0);
  const cancelledTickets = events.reduce((sum, event) => sum + event.metrics.cancelledTickets, 0);
  
  const data = [
    { name: 'Valid Tickets', value: soldTickets, color: '#4ADE80' },
    { name: 'Refunded', value: refundedTickets, color: '#F96521' },
    { name: 'Cancelled', value: cancelledTickets, color: '#EAB308' }
  ].filter(item => item.value > 0);
  
  // If no data, show empty state
  if (data.length === 0 || (soldTickets === 0 && refundedTickets === 0 && cancelledTickets === 0)) {
    return (
      <Card className="bg-[#F9F6F0] border-[#F96521]/20">
        <CardHeader>
          <CardTitle className="text-[#0C090C]">
            <span className="text-[#F96521]">Ticket</span> Distribution
          </CardTitle>
          <CardDescription className="text-[#0C090C]/70">
            Breakdown of ticket statuses
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-60">
          <p className="text-[#0C090C]/70 text-center">
            No ticket data available yet. <br />
            Start selling tickets to see this chart.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-[#F9F6F0] border-[#F96521]/20">
      <CardHeader>
        <CardTitle className="text-[#0C090C]">
          <span className="text-[#F96521]">Ticket</span> Distribution
        </CardTitle>
        <CardDescription className="text-[#0C090C]/70">
          Breakdown of ticket statuses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#F9F6F0', 
                  borderColor: '#F96521', 
                  borderRadius: '8px' 
                }}
                formatter={(value) => [`${value} tickets`, '']}
              />
              <Legend wrapperStyle={{ color: '#0C090C' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
