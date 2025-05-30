"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ArrowLeft, Download, Search, Filter } from "lucide-react";
import Link from "next/link";
import DashboardLayout from "@/components/seller-dashboard/DashboardLayout";
import Spinner from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function TicketingPage() {
  const { user } = useUser();
  const [selectedEvent, setSelectedEvent] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketStatus, setTicketStatus] = useState("all");

  // Get events for the user
  const events = useQuery(api.events.getSellerEvents, {
    userId: user?.id ?? "",
  });

  // Get tickets for the user's events
  const tickets = useQuery(api.events.getUserTickets, {
    userId: user?.id ?? "",
  });

  if (!user) {
    return <div>Please sign in to view your tickets.</div>;
  }

  if (!events || !tickets) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner />
      </div>
    );
  }

  // Filter tickets based on selected event, search query, and status
  const filteredTickets = tickets.filter((ticket) => {
    // Filter by event
    if (selectedEvent !== "all" && ticket.eventId !== selectedEvent) {
      return false;
    }

    // Filter by status
    if (ticketStatus !== "all" && ticket.status !== ticketStatus) {
      return false;
    }

    // Filter by search query (attendee email or name if available)
    if (searchQuery && !ticket.userId.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    return true;
  });

  // Generate CSV data for export
  const generateCSV = () => {
    const headers = [
      "Ticket ID",
      "Event Name",
      "User ID",
      "Purchase Date",
      "Status",
      "Price",
    ];

    const rows = filteredTickets.map((ticket) => [
      ticket._id,
      ticket.event?.name || "Unknown Event",
      ticket.userId,
      new Date(ticket._creationTime).toLocaleDateString(),
      ticket.status,
      ticket.event?.price ? ticket.event.price.toString() : "0",
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
      `tickets-export-${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with title and export button */}
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
                <span className="text-[#F96521]">Ticket</span> Management
              </h1>
              <p className="text-[#0C090C]/70">
                Manage and track tickets for your events
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2 border-[#F96521]/30 text-[#F96521] hover:bg-[#F96521]/10 hover:border-[#F96521]/50"
              onClick={generateCSV}
            >
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="bg-[#F9F6F0] border-[#F96521]/20">
          <CardHeader>
            <CardTitle className="text-[#0C090C]">
              <span className="text-[#F96521]">Filter</span> Tickets
            </CardTitle>
            <CardDescription className="text-[#0C090C]/70">
              Narrow down your results with these filters
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 flex flex-wrap gap-4">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#F96521]/70" />
                  <Input
                    placeholder="Search by attendee ID..."
                    className="pl-8 border-[#F96521]/30 bg-white focus:border-[#F96521] focus:ring-[#F96521]/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select
                  value={selectedEvent}
                  onValueChange={setSelectedEvent}
                >
                  <SelectTrigger className="min-w-[180px] border-[#F96521]/30 bg-white text-[#0C090C] focus:ring-[#F96521]/20">
                    <SelectValue placeholder="Select Event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event._id} value={event._id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={ticketStatus}
                  onValueChange={setTicketStatus}
                >
                  <SelectTrigger className="min-w-[180px] border-[#F96521]/30 bg-white text-[#0C090C] focus:ring-[#F96521]/20">
                    <SelectValue placeholder="Ticket Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="valid">Valid</SelectItem>
                    <SelectItem value="used">Used</SelectItem>
                    <SelectItem value="refunded">Refunded</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tickets Table */}
        <Card className="bg-[#F9F6F0] border-[#F96521]/20 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-[#0C090C]">
              <span className="text-[#F96521]">Tickets</span> ({filteredTickets.length})
            </CardTitle>
            <CardDescription className="text-[#0C090C]/70">
              Manage your event tickets and attendees
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader className="bg-[#F9652110]">
                <TableRow className="hover:bg-[#F9652115] border-b border-[#F96521]/20">
                  <TableHead className="text-[#0C090C]">Ticket ID</TableHead>
                  <TableHead className="text-[#0C090C]">Event</TableHead>
                  <TableHead className="text-[#0C090C]">Attendee</TableHead>
                  <TableHead className="text-[#0C090C]">Purchase Date</TableHead>
                  <TableHead className="text-[#0C090C]">Status</TableHead>
                  <TableHead className="text-[#0C090C]">Price</TableHead>
                  <TableHead className="text-[#0C090C]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.length === 0 ? (
                  <TableRow className="hover:bg-[#F9652110]">
                    <TableCell colSpan={7} className="text-center py-8 text-[#0C090C]/70">
                      No tickets found matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTickets.map((ticket) => (
                    <TableRow key={ticket._id} className="hover:bg-[#F9652110] border-b border-[#F96521]/10">
                      <TableCell className="font-mono text-xs text-[#0C090C]/80">
                        {ticket._id.substring(0, 8)}...
                      </TableCell>
                      <TableCell className="font-medium text-[#0C090C]">{ticket.event?.name || "Unknown Event"}</TableCell>
                      <TableCell className="font-mono text-xs text-[#0C090C]/80">
                        {ticket.userId.substring(0, 12)}...
                      </TableCell>
                      <TableCell className="text-[#0C090C]/80">
                        {new Date(ticket._creationTime).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            ticket.status === "valid"
                              ? "bg-[#4ADE80]/20 text-[#16A34A]"
                              : ticket.status === "used"
                              ? "bg-[#F96521]/20 text-[#F96521]"
                              : ticket.status === "refunded"
                              ? "bg-[#EAB308]/20 text-[#CA8A04]"
                              : "bg-[#94A3B8]/20 text-[#64748B]"
                          }`}
                        >
                          {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                        </span>
                      </TableCell>
                      <TableCell className="text-[#F96521] font-medium">₦{ticket.event?.price ? ticket.event.price.toFixed(2) : "0.00"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={ticket.status !== "valid"}
                            className="h-8 px-2 text-xs border-[#F96521]/30 text-[#F96521] hover:bg-[#F96521]/10 hover:border-[#F96521]/50 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            Check In
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={ticket.status !== "valid"}
                            className="h-8 px-2 text-xs border-[#F96521]/30 text-[#F96521] hover:bg-[#F96521]/10 hover:border-[#F96521]/50 disabled:opacity-50 disabled:pointer-events-none"
                          >
                            Refund
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Coming Soon Features */}
        <Card>
          <CardHeader>
            <CardTitle>Coming Soon</CardTitle>
            <CardDescription>
              More ticket management features are on the way!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full">
                <Filter className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Advanced Filtering</h3>
                <p className="text-sm text-gray-500">
                  Filter tickets by custom date ranges, ticket types, and more.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="bg-green-100 p-2 rounded-full">
                <Download className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">QR Code Check-In</h3>
                <p className="text-sm text-gray-500">
                  Scan QR codes for quick attendee check-ins at the venue.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
