"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCheck, Clock, Users, Calendar } from "lucide-react";

interface CheckInData {
  eventName: string;
  eventDate: string;
  totalTickets: number;
  checkedIn: number;
  attendanceRate: number;
  peakCheckInTime: string;
  avgCheckInTime: string;
  status: 'upcoming' | 'ongoing' | 'completed';
}

interface CheckInAnalyticsProps {
  checkInData: CheckInData[];
}

export default function CheckInAnalytics({ checkInData }: CheckInAnalyticsProps) {
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

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const overallStats = checkInData.reduce(
    (acc, event) => {
      acc.totalEvents += 1;
      acc.totalTickets += event.totalTickets;
      acc.totalCheckedIn += event.checkedIn;
      return acc;
    },
    { totalEvents: 0, totalTickets: 0, totalCheckedIn: 0 }
  );

  const overallAttendanceRate = overallStats.totalTickets > 0 
    ? (overallStats.totalCheckedIn / overallStats.totalTickets) * 100 
    : 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <UserCheck className="w-5 h-5 text-green-600" />
          Check-In Analytics
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Total Events</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{overallStats.totalEvents}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Total Tickets</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{overallStats.totalTickets.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Checked In</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{overallStats.totalCheckedIn.toLocaleString()}</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Attendance Rate</span>
            </div>
            <p className={`text-2xl font-bold ${getAttendanceColor(overallAttendanceRate)}`}>
              {overallAttendanceRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Individual Event Analytics */}
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900 mb-3">Event-by-Event Breakdown</h3>
          {checkInData.map((event, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-medium text-gray-900">{event.eventName}</h4>
                  {getStatusBadge(event.status)}
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(event.eventDate).toLocaleDateString()}
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Attendance Progress</span>
                  <span className={getAttendanceColor(event.attendanceRate)}>
                    {event.checkedIn}/{event.totalTickets} ({event.attendanceRate.toFixed(1)}%)
                  </span>
                </div>
                <Progress value={event.attendanceRate} className="h-2" />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Peak Check-In
                  </p>
                  <p className="font-semibold text-gray-900">{event.peakCheckInTime}</p>
                </div>
                <div>
                  <p className="text-gray-600 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Avg Check-In Time
                  </p>
                  <p className="font-semibold text-gray-900">{event.avgCheckInTime}</p>
                </div>
                <div className="md:col-span-1 col-span-2">
                  <p className="text-gray-600">Status</p>
                  <p className="font-semibold text-gray-900 capitalize">{event.status}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 