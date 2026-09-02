import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ArrowRightIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import ShareBookingButton from "@/components/dashboard/ShareBookingButton";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

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
  const supabase = await createSupabaseServerClient();

  // Get user on server side
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log("🔍 Dashboard: User check:", {
    hasUser: !!user,
    userId: user?.id,
    hasError: !!userError,
    timestamp: new Date().toISOString(),
    path: "/dashboard",
  });

  if (userError || !user) {
    console.log("🔍 Dashboard: No user, redirecting to login");
    redirect("/login");
  }

  console.log("🔍 Dashboard: User authenticated, showing dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 dark:from-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-7xl py-10 px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        {/* Hero */}
        <div className="mb-8 rounded-2xl bg-white/70 p-8 backdrop-blur ring-1 ring-gray-200/60 shadow-lg dark:bg-slate-900/90 dark:ring-slate-700">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Welcome to your dashboard
                </span>
              </h1>
              <p className="mt-2 text-gray-700 dark:text-slate-300">
                Manage availability, share your booking link, and keep track of
                appointments.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/availability"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <CalendarDaysIcon className="h-5 w-5" /> Manage availability
              </Link>
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/availability"
            className="group relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-blue-800 dark:from-blue-950 dark:to-slate-900"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-600/10 p-3 ring-1 ring-blue-200 dark:bg-blue-400/10 dark:ring-blue-800">
                <CalendarDaysIcon className="h-6 w-6 text-blue-700 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Availability
                </h3>
                <p className="mt-1 text-sm text-blue-700/90 dark:text-blue-200">
                  Update working hours and time slots.
                </p>
              </div>
            </div>
            <ArrowRightIcon className="absolute right-4 top-4 h-5 w-5 text-blue-600/60 transition-transform group-hover:translate-x-0.5 dark:text-blue-300" />
          </Link>

          <Link
            href="/dashboard/bookings"
            className="group relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-b from-green-50 to-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-green-800 dark:from-green-950 dark:to-slate-900"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-green-600/10 p-3 ring-1 ring-green-200 dark:bg-green-400/10 dark:ring-green-800">
                <UsersIcon className="h-6 w-6 text-green-700 dark:text-green-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Book Appointments
                </h3>
                <p className="mt-1 text-sm text-green-700/90 dark:text-green-200">
                  Create new bookings and manage appointments.
                </p>
              </div>
            </div>
            <ArrowRightIcon className="absolute right-4 top-4 h-5 w-5 text-green-600/60 transition-transform group-hover:translate-x-0.5 dark:text-green-300" />
          </Link>

          <Link
            href="/dashboard/appointments"
            className="group relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-blue-800 dark:from-blue-950 dark:to-slate-900"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-600/10 p-3 ring-1 ring-blue-200 dark:bg-blue-400/10 dark:ring-blue-800">
                <CalendarDaysIcon className="h-6 w-6 text-blue-700 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  View Appointments
                </h3>
                <p className="mt-1 text-sm text-blue-700/90 dark:text-blue-200">
                  Manage pending, confirmed, and completed appointments.
                </p>
              </div>
            </div>
            <ArrowRightIcon className="absolute right-4 top-4 h-5 w-5 text-blue-600/60 transition-transform group-hover:translate-x-0.5 dark:text-blue-300" />
          </Link>

          <ShareBookingButton userId={user.id} />
        </div>
      </div>
    </div>
  );
}
