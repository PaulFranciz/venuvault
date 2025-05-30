"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

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

interface EventPerformanceTableProps {
  events: EventWithMetrics[];
}

export default function EventPerformanceTable({ events }: EventPerformanceTableProps) {
  const [sortColumn, setSortColumn] = useState<string>("eventDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const sortedEvents = [...events].sort((a, b) => {
    let valueA, valueB;

    if (sortColumn === "eventDate") {
      valueA = a.eventDate;
      valueB = b.eventDate;
    } else if (sortColumn === "name") {
      valueA = a.name;
      valueB = b.name;
    } else if (sortColumn === "soldTickets") {
      valueA = a.metrics.soldTickets;
      valueB = b.metrics.soldTickets;
    } else if (sortColumn === "revenue") {
      valueA = a.metrics.revenue;
      valueB = b.metrics.revenue;
    } else {
      valueA = a[sortColumn as keyof EventWithMetrics];
      valueB = b[sortColumn as keyof EventWithMetrics];
    }

    // Handle possible undefined values by providing defaults
    const safeValueA = valueA ?? "";
    const safeValueB = valueB ?? "";
    
    if (typeof safeValueA === "string" && typeof safeValueB === "string") {
      return sortDirection === "asc"
        ? safeValueA.localeCompare(safeValueB)
        : safeValueB.localeCompare(safeValueA);
    }

    // Convert to numbers with defaults if needed
    const numA = typeof safeValueA === "number" ? safeValueA : 0;
    const numB = typeof safeValueB === "number" ? safeValueB : 0;
    
    return sortDirection === "asc" ? (numA > numB ? 1 : -1) : numA < numB ? 1 : -1;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortDirection === "asc" ? "↑" : "↓";
  };

  const getSellThroughRate = (sold: number, total: number) => {
    if (total === 0) return "0%";
    const rate = (sold / total) * 100;
    return `${rate.toFixed(1)}%`;
  };

  return (
    <Card className="col-span-1 md:col-span-3 bg-[#F9F6F0] border-[#F96521]/20">
      <CardHeader>
        <CardTitle className="text-[#0C090C]">
          <span className="text-[#F96521]">Event</span> Performance
        </CardTitle>
        <CardDescription className="text-[#0C090C]/70">
          Detailed breakdown of sales and revenue by event
        </CardDescription>
      </CardHeader>
      <CardContent className="-mt-2">
        <Table>
          <TableHeader className="bg-[#F9652110]">
            <TableRow className="hover:bg-[#F9652115] border-b border-[#F96521]/20">
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("name")}
                  className="font-medium text-[#0C090C] text-left flex items-center p-0 hover:text-[#F96521] hover:bg-transparent"
                >
                  Event Name {getSortIcon("name")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("eventDate")}
                  className="font-medium text-[#0C090C] text-left flex items-center p-0 hover:text-[#F96521] hover:bg-transparent"
                >
                  Date {getSortIcon("eventDate")}
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("soldTickets")}
                  className="font-medium text-[#0C090C] text-left flex items-center p-0 hover:text-[#F96521] hover:bg-transparent"
                >
                  Tickets Sold {getSortIcon("soldTickets")}
                </Button>
              </TableHead>
              <TableHead className="text-[#0C090C]">Sell-Through Rate</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort("revenue")}
                  className="font-medium text-[#0C090C] text-left flex items-center p-0 hover:text-[#F96521] hover:bg-transparent"
                >
                  Revenue {getSortIcon("revenue")}
                </Button>
              </TableHead>
              <TableHead className="text-[#0C090C]">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedEvents.length === 0 ? (
              <TableRow className="hover:bg-[#F9652110]">
                <TableCell colSpan={6} className="text-center py-4 text-[#0C090C]/70">
                  No events found. Create your first event to see analytics.
                </TableCell>
              </TableRow>
            ) : (
              sortedEvents.map((event) => (
                <TableRow key={event._id} className="hover:bg-[#F9652110] border-b border-[#F96521]/10">
                  <TableCell className="font-medium text-[#0C090C]">{event.name}</TableCell>
                  <TableCell className="text-[#0C090C]/80">
                    {new Date(event.eventDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-[#0C090C]/80">
                    {event.metrics.soldTickets}/{event.totalTickets}
                  </TableCell>
                  <TableCell className="text-[#0C090C]/80">
                    {getSellThroughRate(event.metrics.soldTickets, event.totalTickets)}
                  </TableCell>
                  <TableCell className="text-[#F96521] font-medium">₦{event.metrics.revenue.toFixed(2)}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        event.is_cancelled
                          ? "bg-[#F96521]/20 text-[#F96521]"
                          : event.eventDate < Date.now()
                          ? "bg-[#94A3B8]/20 text-[#64748B]"
                          : "bg-[#4ADE80]/20 text-[#16A34A]"
                      }`}
                    >
                      {event.is_cancelled
                        ? "Cancelled"
                        : event.eventDate < Date.now()
                        ? "Past"
                        : "Active"}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
