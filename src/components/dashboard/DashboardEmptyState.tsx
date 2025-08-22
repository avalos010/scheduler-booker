"use client";

import {
  CalendarDaysIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon,
  PlusIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";

export default function DashboardEmptyState() {
  return (
    <div className="mb-10 space-y-8">
      {/* Empty State Hero */}
      <div className="rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
          <ChartBarIcon className="h-10 w-10 text-blue-600" />
        </div>
        <h3 className="mb-3 text-2xl font-bold text-slate-900">
          Welcome to your dashboard!
        </h3>
        <p className="mb-6 max-w-2xl mx-auto text-slate-600">
          Your dashboard is ready to show your scheduling analytics. To get
          started, set up your availability and start accepting bookings.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard/availability"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
          >
            <PlusIcon className="h-5 w-5" />
            Set Up Availability
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard/bookings"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-slate-700 shadow-sm transition-all hover:border-blue-300 hover:text-blue-700"
          >
            Get Booking Link
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Quick Setup Guide */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h4 className="mb-4 text-lg font-semibold text-slate-900">
          Quick Setup Guide
        </h4>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
              <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            </div>
            <h5 className="mb-2 font-medium text-slate-900">
              1. Set Working Hours
            </h5>
            <p className="text-sm text-slate-600">
              Define when you're available to accept bookings
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <ClockIcon className="h-5 w-5 text-green-600" />
            </div>
            <h5 className="mb-2 font-medium text-slate-900">
              2. Create Time Slots
            </h5>
            <p className="text-sm text-slate-600">
              Set up appointment durations and availability
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
              <UsersIcon className="h-5 w-5 text-purple-600" />
            </div>
            <h5 className="mb-2 font-medium text-slate-900">
              3. Share Your Link
            </h5>
            <p className="text-sm text-slate-600">
              Send your booking link to clients
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100">
              <ChartBarIcon className="h-5 w-5 text-amber-600" />
            </div>
            <h5 className="mb-2 font-medium text-slate-900">
              4. View Analytics
            </h5>
            <p className="text-sm text-slate-600">
              Track bookings and performance
            </p>
          </div>
        </div>
      </div>

      {/* Stats Placeholders */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Today&apos;s Bookings
              </p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                <span>No bookings yet</span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <CalendarDaysIcon className="h-6 w-6 text-slate-400" />
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 w-0 rounded-full bg-slate-300" />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Available Slots
              </p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                <span>Set up availability first</span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <ClockIcon className="h-6 w-6 text-slate-400" />
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 w-0 rounded-full bg-slate-300" />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Total Bookings
              </p>
              <p className="text-3xl font-bold text-slate-900">0</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                <span>Start accepting bookings</span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <UsersIcon className="h-6 w-6 text-slate-400" />
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 w-0 rounded-full bg-slate-300" />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Booking Rate</p>
              <p className="text-3xl font-bold text-slate-900">0%</p>
              <div className="mt-2 flex items-center gap-1 text-sm text-slate-500">
                <span>No slots available</span>
              </div>
            </div>
            <div className="rounded-xl bg-slate-100 p-3">
              <ChartBarIcon className="h-6 w-6 text-slate-400" />
            </div>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
            <div className="h-2 w-0 rounded-full bg-slate-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
