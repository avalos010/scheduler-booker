import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDaysIcon,
  ArrowRightIcon,
  UsersIcon,
  ClockIcon,
  CheckCircleIcon,
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

  const today = new Date().toISOString().slice(0, 10);
  const [pendingResult, confirmedResult, upcomingResult] =
    await Promise.all([
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "pending")
        .gte("date", today),
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("status", "confirmed")
        .gte("date", today),
      supabase
        .from("bookings")
        .select("id, client_name, date, start_time, end_time, status", {
          count: "exact",
        })
        .eq("user_id", user.id)
        .gte("date", today)
        .neq("status", "cancelled")
        .order("date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(4),
    ]);

  const upcomingBookings = upcomingResult.data ?? [];
  const stats = [
    {
      label: "Upcoming bookings",
      value: upcomingResult.count ?? 0,
      icon: CalendarDaysIcon,
      iconClass:
        "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
    },
    {
      label: "Upcoming pending",
      value: pendingResult.count ?? 0,
      icon: ClockIcon,
      iconClass:
        "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    },
    {
      label: "Upcoming confirmed",
      value: confirmedResult.count ?? 0,
      icon: CheckCircleIcon,
      iconClass:
        "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
    },
  ];

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

        {/* Overview */}
        <section className="mb-8" aria-labelledby="overview-heading">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-300">
                At a glance
              </p>
              <h2
                id="overview-heading"
                className="text-2xl font-bold text-gray-900"
              >
                Booking overview
              </h2>
            </div>
            <Link
              href="/dashboard/appointments"
              className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            >
              View all appointments
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-3xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                    <div className={`rounded-xl p-3 ${stat.iconClass}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Quick actions */}
        <section aria-labelledby="quick-actions-heading">
          <h2
            id="quick-actions-heading"
            className="mb-4 text-2xl font-bold text-gray-900"
          >
            Quick actions
          </h2>
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
        </section>

        {/* Upcoming schedule */}
        <section
          className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900"
          aria-labelledby="upcoming-heading"
        >
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5 dark:border-slate-700">
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-300">
                Your schedule
              </p>
              <h2
                id="upcoming-heading"
                className="text-xl font-bold text-gray-900"
              >
                Upcoming appointments
              </h2>
            </div>
            <Link
              href="/dashboard/appointments"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
            >
              Open schedule
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          {upcomingBookings.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-slate-700">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="min-w-16 rounded-xl bg-gray-100 px-3 py-2 text-center dark:bg-slate-800">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          timeZone: "UTC",
                        }).format(new Date(`${booking.date}T00:00:00Z`))}
                      </p>
                      <p className="text-xl font-bold text-gray-900">
                        {booking.date.slice(-2)}
                      </p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {booking.client_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {booking.start_time.slice(0, 5)}–{booking.end_time.slice(0, 5)}
                      </p>
                    </div>
                  </div>
                  <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold capitalize text-blue-800 dark:bg-blue-950 dark:text-blue-200">
                    {booking.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-6 py-12 text-center">
              <CalendarDaysIcon className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-3 font-medium text-gray-900">
                Your schedule is clear
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Share your booking link to start receiving appointments.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
