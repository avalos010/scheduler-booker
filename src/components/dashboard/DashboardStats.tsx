"use client";

import {
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { useDashboardAnalytics } from "@/lib/hooks/useDashboardAnalytics";
import DashboardEmptyState from "./DashboardEmptyState";

export default function DashboardStats() {
  const { data, loading, error } = useDashboardAnalytics();

  if (loading) {
    return (
      <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                <div className="h-8 w-16 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
              </div>
              <div className="rounded-xl bg-slate-100 p-3">
                <div className="h-6 w-6 animate-pulse rounded bg-slate-200" />
              </div>
            </div>
            <div className="mt-4 h-2 w-full animate-pulse rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    // Show empty state if there's an error or no data
    return <DashboardEmptyState />;
  }

  const { stats } = data;

  // Check if user has any meaningful data
  const hasData =
    stats.todayBookings > 0 ||
    stats.availableSlots > 0 ||
    stats.totalClients > 0;

  // Show empty state if no meaningful data
  if (!hasData) {
    return <DashboardEmptyState />;
  }

  return (
    <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {/* Today's Bookings */}
      <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">
              Today&apos;s Bookings
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {stats.todayBookings}
            </p>
            <div className="mt-2 flex items-center gap-1 text-sm">
              {stats.todayTrend > 0 ? (
                <span className="text-green-600">
                  <ArrowUpIcon className="h-4 w-4 inline" />+{stats.todayTrend}{" "}
                  from yesterday
                </span>
              ) : stats.todayTrend < 0 ? (
                <span className="text-red-600">
                  <ArrowDownIcon className="h-4 w-4 inline" />
                  {stats.todayTrend} from yesterday
                </span>
              ) : (
                <span className="text-slate-500">Same as yesterday</span>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-green-100 p-3">
            <CalendarDaysIcon className="h-6 w-6 text-green-600" />
          </div>
        </div>
        {/* Progress bar - Calculate percentage based on daily capacity */}
        <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-green-500 transition-all duration-300 group-hover:w-full"
            style={{
              width: `${Math.min(
                (stats.todayBookings / Math.max(stats.totalSlots, 1)) * 100,
                100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Available Slots */}
      <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">
              Available Slots
            </p>
            <p className="text-3xl font-bold text-slate-900">
              {stats.availableSlots === 0 ? "No slots" : stats.availableSlots}
            </p>
            <div className="mt-2 flex items-center gap-1 text-sm text-blue-600">
              <span>This week</span>
            </div>
          </div>
          <div className="rounded-xl bg-blue-100 p-3">
            <ClockIcon className="h-6 w-6 text-blue-600" />
          </div>
        </div>
        {/* Progress bar - Calculate percentage of available vs total slots */}
        <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all duration-300 group-hover:w-full"
            style={{
              width: `${Math.min(
                (stats.availableSlots / Math.max(stats.totalSlots, 1)) * 100,
                100
              )}%`,
            }}
          />
        </div>
      </div>

      {/* Total Clients */}
      <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Bookings</p>
            <p className="text-3xl font-bold text-slate-900">
              {stats.totalClients}
            </p>
            <div className="mt-2 flex items-center gap-1 text-sm text-purple-600">
              <span>Total bookings</span>
            </div>
          </div>
          <div className="rounded-xl bg-purple-100 p-3">
            <UsersIcon className="h-6 w-6 text-purple-600" />
          </div>
        </div>
        {/* Progress bar - Show as percentage of a reasonable goal */}
        <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-purple-500 transition-all duration-300 group-hover:w-full"
            style={{
              width: `${Math.min((stats.totalClients / 100) * 100, 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Booking Rate */}
      <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Booking Rate</p>
            <p className="text-3xl font-bold text-slate-900">
              {stats.bookingRate}%
            </p>
            <div className="mt-2 flex items-center gap-1 text-sm text-amber-600">
              <span>Today&apos;s utilization</span>
            </div>
          </div>
          <div className="rounded-xl bg-amber-100 p-3">
            <ChartBarIcon className="h-6 w-6 text-amber-600" />
          </div>
        </div>
        {/* Progress bar - Use the actual booking rate */}
        <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-amber-500 transition-all duration-300 group-hover:w-full"
            style={{ width: `${Math.min(stats.bookingRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
