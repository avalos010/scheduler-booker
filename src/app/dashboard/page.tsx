import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDaysIcon,
  Cog6ToothIcon,
  ArrowRightIcon,
  UsersIcon,
  ShareIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon,
  BellIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import DashboardCharts from "@/components/dashboard/DashboardCharts";

export const metadata: Metadata = {
  title: "Dashboard - Manage Your Appointments & Availability",
  description:
    "Access your Scheduler Booker dashboard to manage appointments, set availability, and streamline your professional scheduling. Everything you need in one place.",
  keywords: [
    "scheduling dashboard",
    "appointment management",
    "availability settings",
    "professional calendar",
    "booking management",
    "client appointments",
    "schedule overview",
  ],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Dashboard - Scheduler Booker",
    description:
      "Access your Scheduler Booker dashboard to manage appointments, set availability, and streamline your professional scheduling.",
    url: "https://scheduler-booker.vercel.app/dashboard",
  },
  alternates: {
    canonical: "/dashboard",
  },
};

export default async function DashboardPage() {
  // TODO: This component currently uses hardcoded data for demonstration
  // Future implementation should:
  // 1. Fetch real-time stats from various API endpoints
  // 2. Implement loading states and error handling
  // 3. Add real-time updates or refresh functionality
  // 4. Calculate trends and percentages dynamically
  // 5. Add data caching for performance

  const supabase = await createSupabaseServerClient();

  // Get session on server side
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("🔍 Dashboard: Session check:", {
    hasSession: !!session,
    userId: session?.user?.id,
    timestamp: new Date().toISOString(),
    path: "/dashboard",
  });

  if (!session) {
    console.log("🔍 Dashboard: No session, redirecting to login");
    redirect("/login");
  }

  console.log("🔍 Dashboard: User authenticated, showing dashboard");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl py-6 px-4 sm:py-8 sm:px-6 lg:py-12 lg:px-8">
        {/* Modern Hero Section */}
        <div className="relative mb-10 overflow-hidden rounded-3xl bg-white p-8 shadow-xl ring-1 ring-slate-200/60 sm:p-10 lg:p-12">
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                Dashboard Active
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Welcome back,
                <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {session.user.email}
                </span>
              </h1>
              <p className="max-w-2xl text-lg text-slate-600 sm:text-xl">
                Streamline your scheduling with powerful tools for availability
                management, appointment tracking, and client bookings.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/dashboard/availability"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-6 py-4 text-white shadow-lg transition-all duration-300 hover:bg-blue-700 hover:shadow-xl hover:scale-105 active:scale-95"
              >
                <CalendarDaysIcon className="h-6 w-6" />
                <span className="font-semibold">Manage Availability</span>
                <ArrowRightIcon className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/dashboard/appointments"
                className="group inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-slate-200 bg-white px-6 py-4 text-slate-700 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-md hover:scale-105 active:scale-95"
              >
                <UsersIcon className="h-6 w-6" />
                <span className="font-semibold">View Appointments</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Overview - TODO: Replace hardcoded values with real data */}
        <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* TODO: Fetch from /api/bookings?date=today */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Today&apos;s Bookings
                </p>
                {/* TODO: Replace with real count */}
                <p className="text-3xl font-bold text-slate-900">12</p>
                <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
                  <ArrowUpIcon className="h-4 w-4" />
                  {/* TODO: Calculate real trend from yesterday's data */}
                  <span>+2 from yesterday</span>
                </div>
              </div>
              <div className="rounded-xl bg-green-100 p-3">
                <CalendarDaysIcon className="h-6 w-6 text-green-600" />
              </div>
            </div>
            {/* Progress bar - TODO: Calculate real percentage based on daily capacity */}
            <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
              <div className="h-2 w-3/4 rounded-full bg-green-500 transition-all duration-300 group-hover:w-full" />
            </div>
          </div>

          {/* TODO: Fetch from /api/availability/time-slots?week=current */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Available Slots
                </p>
                {/* TODO: Replace with real count from availability API */}
                <p className="text-3xl font-bold text-slate-900">47</p>
                <div className="mt-2 flex items-center gap-1 text-sm text-blue-600">
                  <span>This week</span>
                </div>
              </div>
              <div className="rounded-xl bg-blue-100 p-3">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            {/* Progress bar - TODO: Calculate real percentage of available vs total slots */}
            <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
              <div className="h-2 w-2/3 rounded-full bg-blue-500 transition-all duration-300 group-hover:w-full" />
            </div>
          </div>

          {/* TODO: Fetch from /api/bookings/clients or create new endpoint */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Total Clients
                </p>
                {/* TODO: Replace with real count from clients API */}
                <p className="text-3xl font-bold text-slate-900">89</p>
                <div className="mt-2 flex items-center gap-1 text-sm text-purple-600">
                  <ArrowUpIcon className="h-4 w-4" />
                  {/* TODO: Calculate real monthly growth */}
                  <span>+5 this month</span>
                </div>
              </div>
              <div className="rounded-xl bg-purple-100 p-3">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            {/* Progress bar - TODO: Calculate real percentage based on target goals */}
            <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
              <div className="h-2 w-4/5 rounded-full bg-purple-500 transition-all duration-300 group-hover:w-full" />
            </div>
          </div>

          {/* TODO: Calculate from bookings vs available slots data */}
          <div className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">
                  Booking Rate
                </p>
                {/* TODO: Calculate real percentage: (booked slots / total slots) * 100 */}
                <p className="text-3xl font-bold text-slate-900">94%</p>
                <div className="mt-2 flex items-center gap-1 text-sm text-amber-600">
                  <ArrowUpIcon className="h-4 w-4" />
                  {/* TODO: Compare with previous month's booking rate */}
                  <span>+3% vs last month</span>
                </div>
              </div>
              <div className="rounded-xl bg-amber-100 p-3">
                <ChartBarIcon className="h-6 w-6 text-amber-600" />
              </div>
            </div>
            {/* Progress bar - TODO: Use real calculated percentage */}
            <div className="mt-4 h-2 w-full rounded-full bg-slate-200">
              <div className="h-2 w-[94%] rounded-full bg-amber-500 transition-all duration-300 group-hover:w-full" />
            </div>
          </div>
        </div>

        {/* Charts Component - Client-side rendered */}
        <DashboardCharts />

        {/* Quick Actions Grid */}
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/dashboard/availability"
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-xl hover:-translate-y-2"
          >
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 rounded-2xl bg-blue-600 p-4 shadow-lg">
                <CalendarDaysIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">
                Availability
              </h3>
              <p className="text-slate-600">Set working hours and time slots</p>
              <div className="mt-4 inline-flex items-center gap-2 text-blue-600 font-medium">
                <span>Configure</span>
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/appointments"
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:border-green-300 hover:shadow-xl hover:-translate-y-2"
          >
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 rounded-2xl bg-green-600 p-4 shadow-lg">
                <UsersIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">
                Appointments
              </h3>
              <p className="text-slate-600">View and manage bookings</p>
              <div className="mt-4 inline-flex items-center gap-2 text-green-600 font-medium">
                <span>View All</span>
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard/bookings"
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all duration-300 hover:border-purple-300 hover:shadow-xl hover:-translate-y-2"
          >
            <div className="relative flex flex-col items-center text-center">
              <div className="mb-4 rounded-2xl bg-purple-600 p-4 shadow-lg">
                <ShareIcon className="h-8 w-8 text-white" />
              </div>
              <h3 className="mb-2 text-xl font-bold text-slate-900">
                Share Link
              </h3>
              <p className="text-slate-600">Get your booking link</p>
              <div className="mt-4 inline-flex items-center gap-2 text-purple-600 font-medium">
                <span>Get Link</span>
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </Link>
        </div>

        {/* Enhanced Next Steps */}
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-2xl bg-amber-600 p-3 shadow-lg">
              <Cog6ToothIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Next Steps</h3>
              <p className="text-slate-600">
                Complete your setup to get the most out of your dashboard
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <CheckCircleIcon className="mt-1 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-slate-900">
                  Customize booking page
                </p>
                <p className="text-sm text-slate-500">
                  Personalize your client experience
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <CheckCircleIcon className="mt-1 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-slate-900">
                  Payment integration
                </p>
                <p className="text-sm text-slate-500">
                  Accept deposits and payments
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <CheckCircleIcon className="mt-1 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-slate-900">
                  Email notifications
                </p>
                <p className="text-sm text-slate-500">Keep clients informed</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm">
              <CheckCircleIcon className="mt-1 h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-slate-900">Team collaboration</p>
                <p className="text-sm text-slate-500">Add team members</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
