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

// Hardcoded chart data
const weeklyBookingsData = [
  { day: "Mon", bookings: 8, available: 12 },
  { day: "Tue", bookings: 12, available: 15 },
  { day: "Wed", bookings: 15, available: 18 },
  { day: "Thu", bookings: 11, available: 14 },
  { day: "Fri", bookings: 9, available: 12 },
  { day: "Sat", bookings: 5, available: 8 },
  { day: "Sun", bookings: 3, available: 6 },
];

const dailyAvailabilityData = [
  { time: "9AM", slots: 8, booked: 3 },
  { time: "10AM", slots: 8, booked: 6 },
  { time: "11AM", slots: 8, booked: 7 },
  { time: "12PM", slots: 8, booked: 2 },
  { time: "1PM", slots: 8, booked: 5 },
  { time: "2PM", slots: 8, booked: 4 },
  { time: "3PM", slots: 8, booked: 6 },
  { time: "4PM", slots: 8, booked: 3 },
];

const bookingStatusData = [
  { name: "Confirmed", value: 65, color: "#10B981" },
  { name: "Pending", value: 20, color: "#F59E0B" },
  { name: "Cancelled", value: 15, color: "#EF4444" },
];

export default function DashboardCharts() {
  return (
    <>
      {/* Charts Section - TODO: Replace with real-time data */}
      <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* TODO: Fetch weekly data from /api/bookings/weekly */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Weekly Bookings Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyBookingsData}>
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

        {/* TODO: Fetch daily availability from /api/availability/daily */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">
            Daily Availability
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={dailyAvailabilityData}>
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

      {/* TODO: Fetch booking status data from /api/bookings/status */}
      <div className="mb-10 rounded-2xl bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">
          Booking Status Distribution
        </h3>
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={bookingStatusData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {bookingStatusData.map((entry, index) => (
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
          {bookingStatusData.map((item, index) => (
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
    </>
  );
}
