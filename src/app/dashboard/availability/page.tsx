import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AvailabilityCalendar from "@/components/availability/AvailabilityCalendar";
import { AvailabilityManager } from "@/lib/managers/availabilityManager";

export default async function AvailabilityPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // Get session on server side
  const {
    data: { session },
  } = await supabase.auth.getSession();

  console.log("🔍 Availability: Session check:", {
    hasSession: !!session,
    userId: session?.user?.id,
    timestamp: new Date().toISOString(),
    path: "/dashboard/availability",
  });

  if (!session) {
    console.log("🔍 Availability: No session, redirecting to login");
    redirect("/login");
  }

  console.log("🔍 Availability: User authenticated, loading availability data");

  // Load availability data on the server
  const availabilityResult = await AvailabilityManager.loadAvailabilityData(
    session.user.id,
    true
  );

  console.log("🔍 Availability: AvailabilityManager result:", {
    success: availabilityResult.success,
    hasData: "data" in availabilityResult,
    error: "error" in availabilityResult ? availabilityResult.error : null,
    dataKeys:
      availabilityResult.success && "data" in availabilityResult
        ? Object.keys(availabilityResult.data)
        : null,
  });

  if (!availabilityResult.success) {
    const errorMessage =
      "error" in availabilityResult
        ? availabilityResult.error
        : "Unknown error";
    console.error("🔍 Availability: AvailabilityManager failed:", errorMessage);
    throw new Error(`Failed to load availability data: ${errorMessage}`);
  }

  if (!("data" in availabilityResult) || !availabilityResult.data) {
    console.error("🔍 Availability: No data in result:", availabilityResult);
    throw new Error("Availability data is missing from result");
  }

  const { workingHours, settings, availability } = availabilityResult.data;

  console.log("🔍 Availability: Data being passed to calendar:", {
    workingHoursLength: workingHours?.length,
    settings: settings,
    availabilityKeys: Object.keys(availability || {}).length,
    userId: session.user.id,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="mx-auto max-w-7xl py-10 px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
              Manage your availability
            </h1>
            <p className="mt-1 text-gray-700">
              Set working hours and time slots clients can book.
            </p>
          </div>
        </div>

        {/* Calendar Card */}
        <div className="rounded-2xl bg-white/70 p-6 shadow-lg ring-1 ring-gray-200/60 backdrop-blur">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Calendar</h2>
          <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
            <AvailabilityCalendar
              initialWorkingHours={workingHours}
              initialSettings={settings}
              initialAvailability={availability}
              userId={session.user.id}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
