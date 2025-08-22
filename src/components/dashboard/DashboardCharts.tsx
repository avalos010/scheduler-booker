"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboardAnalytics } from "@/lib/hooks/useDashboardAnalytics";
import { ChartBarIcon } from "@heroicons/react/24/outline";

export default function DashboardCharts() {
  const { data, loading, error, period, setPeriod } = useDashboardAnalytics();

  if (loading) {
    return (
      <div className="mb-10 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Analytics</h3>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
          </select>
        </div>

        {/* Loading skeletons */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-48 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 h-6 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-48 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="h-48 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-10 rounded-2xl bg-red-50 p-6 text-center">
        <p className="text-red-600">Error loading analytics: {error}</p>
        <p className="mt-2 text-sm text-red-500">
          Please try refreshing the page
        </p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { charts } = data;

  // Check if there's meaningful chart data - all values must be 0 to show empty state
  const hasChartData =
    charts.weeklyTrend.some((day) => day.bookings > 0) ||
    charts.dailyAvailability.some((time) => time.booked > 0) ||
    charts.bookingStatus.some((status) => status.value > 0);

  if (!hasChartData) {
    return (
      <div className="mb-10 rounded-2xl bg-blue-50 p-6 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-blue-900">
          No analytics yet
        </h3>
        <p className="text-blue-700">
          Once you start receiving bookings, your analytics charts will display
          here with real data.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Charts Section - Now using real data! */}
      <div className="mb-10 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Analytics</h3>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <button
              onClick={() => window.location.reload()}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Weekly Bookings Trend */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Weekly Bookings Trend
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={charts.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="day" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bookings"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ fill: "#3B82F6", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Daily Availability */}
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">
              Daily Availability
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={charts.dailyAvailability}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="time" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
                <Bar dataKey="slots" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="booked" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Booking Status Distribution */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Booking Status Distribution
          </h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={charts.bookingStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {charts.bookingStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #E2E8F0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center gap-6">
            {charts.bookingStatus.map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-600">
                  {item.name}: {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
