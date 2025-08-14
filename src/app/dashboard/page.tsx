import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  CalendarDaysIcon,
  Cog6ToothIcon,
  ArrowRightIcon,
  UsersIcon,
  ShareIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function DashboardPage() {
  // Force fresh authentication check by adding cache busting
  const timestamp = Date.now();

  const cookieStore = await cookies();

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="mx-auto max-w-7xl py-10 px-6 lg:px-8">
        {/* Hero */}
        <div className="mb-8 rounded-2xl bg-white/70 p-8 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Welcome to your dashboard
                </span>
              </h1>
              <p className="mt-2 text-gray-700">
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Link
            href="/dashboard/availability"
            className="group relative overflow-hidden rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50 to-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-blue-600/10 p-3 ring-1 ring-blue-200">
                <CalendarDaysIcon className="h-6 w-6 text-blue-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Manage Availability
                </h3>
                <p className="mt-1 text-sm text-blue-700/90">
                  Update working hours and time slots.
                </p>
              </div>
            </div>
            <ArrowRightIcon className="absolute right-4 top-4 h-5 w-5 text-blue-600/60 transition-transform group-hover:translate-x-0.5" />
          </Link>

          <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-b from-green-50 to-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-green-600/10 p-3 ring-1 ring-green-200">
                <UsersIcon className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  View Appointments
                </h3>
                <p className="mt-1 text-sm text-green-700/90">
                  See upcoming and past bookings.
                </p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50 to-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="rounded-lg bg-purple-600/10 p-3 ring-1 ring-purple-200">
                <ShareIcon className="h-6 w-6 text-purple-700" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Share Booking Link
                </h3>
                <p className="mt-1 text-sm text-purple-700/90">
                  Send your link to clients to book.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-8 rounded-2xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Cog6ToothIcon className="h-5 w-5 text-amber-700" />
            <h3 className="text-lg font-semibold text-amber-900">Next steps</h3>
          </div>
          <ul className="space-y-2 text-sm text-amber-800">
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 text-amber-700" />
              Customize your booking page
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 text-amber-700" />
              Set up payment integration
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 text-amber-700" />
              Configure email notifications
            </li>
            <li className="flex items-start gap-2">
              <CheckCircleIcon className="mt-0.5 h-4 w-4 text-amber-700" />
              Add team members (if applicable)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
