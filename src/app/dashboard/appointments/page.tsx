import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import AppointmentsList from "@/components/appointments/AppointmentsList";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function AppointmentsPage() {
  const supabase = await createSupabaseServerClient();

  // Get session on server side
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="mx-auto max-w-6xl py-10 px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Appointments" },
          ]}
        />
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-white/70 p-8 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Appointments
            </span>
          </h1>
          <p className="mt-2 text-gray-700">
            View and manage all your appointments and pending bookings.
          </p>
        </div>

        {/* Appointments List */}
        <div className="rounded-2xl bg-white/70 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <AppointmentsList userId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
