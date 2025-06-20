"use client";

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { 
  Users, 
  Ticket, 
  Clock, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  XCircle,
  DollarSign,
  Activity,
  UserCheck,
  UserX,
  Timer
} from 'lucide-react';

interface EventAnalyticsDashboardProps {
  eventId: Id<"events">;
}

export default function EventAnalyticsDashboard({ eventId }: EventAnalyticsDashboardProps) {
  // Get real-time analytics for this event
  const analytics = useQuery(api.events.getEventAnalytics, { eventId });
  const waitingList = useQuery(api.events.getEventWaitingList, { eventId });

  if (!analytics || !waitingList) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `£${amount.toFixed(2)}`;
  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Real-time Analytics</h2>
          <p className="text-gray-600">{analytics.event.name}</p>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
          Live updates
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tickets Sold */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Tickets Sold</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.tickets.sold}
                <span className="text-sm text-gray-500 font-normal">
                  /{analytics.event.totalTickets}
                </span>
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Ticket className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(analytics.tickets.sold / analytics.event.totalTickets) * 100}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {analytics.tickets.remaining} remaining
            </p>
          </div>
        </div>

        {/* Active Reservations */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Reservations</p>
              <p className="text-2xl font-bold text-orange-600">
                {analytics.waitingList.activeReservations}
              </p>
            </div>
            <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <div className="h-2 w-2 bg-orange-500 rounded-full animate-pulse mr-2"></div>
              <span className="text-gray-500">People trying to buy now</span>
            </div>
          </div>
        </div>

        {/* Waiting List */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Waiting List</p>
              <p className="text-2xl font-bold text-purple-600">
                {analytics.waitingList.totalWaiting}
              </p>
            </div>
            <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-purple-600 font-medium">
                {analytics.waitingList.conversionRate}%
              </span>
              <span className="text-gray-500 ml-1">conversion rate</span>
            </div>
          </div>
        </div>

        {/* Revenue */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(analytics.revenue.net)}
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center text-sm">
              <span className="text-green-600 font-medium">
                +{analytics.recentActivity.ticketsSoldLast24h}
              </span>
              <span className="text-gray-500 ml-1">sales today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiting List Status */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Waiting List Activity
          </h3>
          
          <div className="space-y-3">
            {waitingList.grouped.offered.length > 0 && (
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Timer className="h-5 w-5 text-orange-600 mr-2" />
                    <span className="font-medium text-orange-900">
                      {waitingList.grouped.offered.length} Active Reservations
                    </span>
                  </div>
                  <div className="text-sm text-orange-700">
                    Expires in ~10 min
                  </div>
                </div>
                <p className="text-sm text-orange-700 mt-1">
                  People currently trying to complete their purchase
                </p>
              </div>
            )}

            {waitingList.grouped.waiting.length > 0 && (
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-purple-600 mr-2" />
                    <span className="font-medium text-purple-900">
                      {waitingList.grouped.waiting.length} People Waiting
                    </span>
                  </div>
                </div>
                <p className="text-sm text-purple-700 mt-1">
                  Will be notified when tickets become available
                </p>
              </div>
            )}

            {waitingList.grouped.purchased.length > 0 && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">
                    {waitingList.grouped.purchased.length} Completed Purchases
                  </span>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  Successfully converted from waiting list
                </p>
              </div>
            )}

            {waitingList.summary.totalActive === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>No current activity</p>
                <p className="text-sm">Reservations and waiting list activity will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* Hourly Sales Chart */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Sales Activity (Last 24 Hours)
          </h3>
          
          <div className="space-y-2">
            {analytics.timeline.hourlyData.slice(-6).map((hour, index) => (
              <div key={hour.timestamp} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                <div className="flex items-center">
                  <div className="text-sm font-medium text-gray-600 w-16">
                    {hour.hour}:00
                  </div>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.max(5, (hour.ticketsSold / Math.max(...analytics.timeline.hourlyData.map(h => h.ticketsSold), 1)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-900 font-medium">
                  {hour.ticketsSold} tickets
                </div>
              </div>
            ))}
            
            {analytics.timeline.hourlyData.every(h => h.ticketsSold === 0) && (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>No sales activity yet</p>
                <p className="text-sm">Hourly sales data will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total Interest:</span>
            <span className="ml-2 font-medium">{analytics.waitingList.totalInterested} people</span>
          </div>
          <div>
            <span className="text-gray-600">Conversion Rate:</span>
            <span className="ml-2 font-medium">{analytics.waitingList.conversionRate}%</span>
          </div>
          <div>
            <span className="text-gray-600">Revenue per Ticket:</span>
            <span className="ml-2 font-medium">
              {analytics.tickets.sold > 0 
                ? formatCurrency(analytics.revenue.total / analytics.tickets.sold)
                : '£0.00'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
} 