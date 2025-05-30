"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// Admin token - in production, this would come from a secure authentication flow
const ADMIN_TOKEN = 'admin-secret-key';

export default function QueueAnalyticsDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Define colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  const QUEUE_COLORS = {
    ticketReservation: '#0088FE',
    paymentProcessing: '#00C49F',
    notification: '#FFBB28',
    waitlistProcessing: '#FF8042',
  };

  // Fetch stats from API
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/queue-stats?token=${ADMIN_TOKEN}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setStats(data);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      console.error('Error fetching queue stats:', err);
    } finally {
      setLoading(false);
    }
  };

  // Set up auto-refresh
  useEffect(() => {
    fetchStats();
    
    const intervalId = setInterval(() => {
      fetchStats();
    }, refreshInterval * 1000);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Handle manual refresh
  const handleRefresh = () => {
    fetchStats();
  };

  // Convert Redis memory stats to MB
  const formatMemory = (bytes: string) => {
    const mb = parseInt(bytes) / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Queue Analytics Dashboard</h1>
          <div className="flex items-center space-x-4">
            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              className="border border-gray-300 rounded-md p-2 bg-white"
            >
              <option value={10}>Refresh: 10s</option>
              <option value={30}>Refresh: 30s</option>
              <option value={60}>Refresh: 1m</option>
              <option value={300}>Refresh: 5m</option>
            </select>
            <button
              onClick={handleRefresh}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Refresh Now
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">
            Last refreshed: {lastRefreshed.toLocaleTimeString()}
          </p>
        </div>

        {stats && (
          <>
            {/* System Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SystemCard
                title="Total Jobs in System"
                value={Object.values(stats.queue_stats).reduce(
                  (acc: number, queue: any) => acc + (queue.counts?.total || 0),
                  0
                )}
                icon="📋"
              />
              <SystemCard
                title="Processing Rate"
                value={`${Object.values(stats.processing_rates).reduce(
                  (acc: number, queue: any) => acc + (queue.current_rate || 0),
                  0
                )} jobs/min`}
                icon="⚡"
              />
              <SystemCard
                title="Redis Memory"
                value={formatMemory(stats.redis_stats.memory?.used_memory || '0')}
                icon="💾"
              />
              <SystemCard
                title="Failed Jobs"
                value={Object.values(stats.queue_stats).reduce(
                  (acc: number, queue: any) => acc + (queue.counts?.failed || 0),
                  0
                )}
                icon="⚠️"
                alert={true}
              />
            </div>

            {/* Queue Status */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Queue Status</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Current Queue Size</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(stats.queue_stats).map(([name, data]: [string, any]) => ({
                          name,
                          waiting: data.counts?.waiting || 0,
                          active: data.counts?.active || 0,
                          delayed: data.counts?.delayed || 0,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="waiting" stackId="a" fill="#8884d8" name="Waiting" />
                        <Bar dataKey="active" stackId="a" fill="#82ca9d" name="Active" />
                        <Bar dataKey="delayed" stackId="a" fill="#ffc658" name="Delayed" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Processing Rates</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(stats.processing_rates).map(([name, data]: [string, any]) => ({
                          name,
                          currentRate: data.current_rate || 0,
                          peakRate: data.peak_rate || 0,
                          capacity: data.capacity || 0,
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="currentRate" fill="#8884d8" name="Current Rate (jobs/min)" />
                        <Bar dataKey="peakRate" fill="#82ca9d" name="Peak Rate (jobs/min)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Historical Data */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Historical Performance</h2>
              </div>
              <div className="p-6">
                <div className="mb-8">
                  <h3 className="text-lg font-semibold mb-4">Completed Jobs (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={stats.job_history.dates.map((date: string, i: number) => ({
                        date,
                        ...Object.entries(stats.job_history.queues).reduce(
                          (acc: any, [queueName, queueData]: [string, any]) => ({
                            ...acc,
                            [queueName]: queueData.completed[i],
                          }),
                          {}
                        ),
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {Object.keys(stats.job_history.queues).map((queueName, index) => (
                        <Line
                          key={queueName}
                          type="monotone"
                          dataKey={queueName}
                          stroke={COLORS[index % COLORS.length]}
                          activeDot={{ r: 8 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Failed Jobs (Last 7 Days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={stats.job_history.dates.map((date: string, i: number) => ({
                        date,
                        ...Object.entries(stats.job_history.queues).reduce(
                          (acc: any, [queueName, queueData]: [string, any]) => ({
                            ...acc,
                            [queueName]: queueData.failed[i],
                          }),
                          {}
                        ),
                      }))}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      {Object.keys(stats.job_history.queues).map((queueName, index) => (
                        <Line
                          key={queueName}
                          type="monotone"
                          dataKey={queueName}
                          stroke={COLORS[index % COLORS.length]}
                          activeDot={{ r: 8 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Failed Jobs Analysis */}
            {Object.values(stats.queue_stats).some((queue: any) => 
              queue.samples?.failed && queue.samples.failed.length > 0
            ) && (
              <div className="bg-white rounded-lg shadow mb-8">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-xl font-bold text-gray-800">Failed Jobs Analysis</h2>
                </div>
                <div className="p-6">
                  {Object.entries(stats.queue_stats).map(([queueName, queueData]: [string, any]) => {
                    const failedJobs = queueData.samples?.failed || [];
                    if (failedJobs.length === 0) return null;
                    
                    return (
                      <div key={queueName} className="mb-8">
                        <h3 className="text-lg font-semibold mb-4">{queueName}</h3>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Job ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Timestamp
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Attempts
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Failure Reason
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {failedJobs.map((job: any) => (
                                <tr key={job.id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {job.id}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(job.timestamp).toLocaleString()}
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {job.attemptsMade}
                                  </td>
                                  <td className="px-6 py-4 text-sm text-red-500">
                                    {job.failedReason || 'Unknown error'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Redis Health */}
            <div className="bg-white rounded-lg shadow mb-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-800">Redis Health</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-2">Memory Usage</h3>
                    <div className="text-2xl font-bold">
                      {formatMemory(stats.redis_stats.memory?.used_memory || '0')}
                    </div>
                    <div className="text-sm text-gray-500">
                      Peak: {formatMemory(stats.redis_stats.memory?.used_memory_peak || '0')}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-2">Connected Clients</h3>
                    <div className="text-2xl font-bold">
                      {stats.redis_stats.clients?.connected_clients || '0'}
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-semibold mb-2">Operations</h3>
                    <div className="text-2xl font-bold">
                      {stats.redis_stats.stats?.total_commands_processed || '0'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Commands/sec: {stats.redis_stats.stats?.instantaneous_ops_per_sec || '0'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// System Card Component
function SystemCard({ title, value, icon, alert = false }: { title: string; value: string | number; icon: string; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${alert ? 'border-l-4 border-red-500' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}
