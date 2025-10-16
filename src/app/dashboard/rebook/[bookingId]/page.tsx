import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import RebookForm from "@/components/bookings/RebookForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

interface RebookPageProps {
  params: Promise<{
    bookingId: string;
  }>;
}

export default async function RebookPage({ params }: RebookPageProps) {
  const { bookingId } = await params;
  const supabase = await createSupabaseServerClient();

  // Get user on server side
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="mx-auto max-w-4xl py-10 px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Appointments", href: "/dashboard/appointments" },
            { label: "Rebook Appointment" },
          ]}
        />

        {/* Header */}
        <div className="mb-8 rounded-2xl bg-white/70 p-8 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Rebook Appointment
            </span>
          </h1>
          <p className="mt-2 text-gray-700">
            Select a new date and time for this appointment. The old appointment
            will be automatically cancelled.
          </p>
        </div>

        {/* Rebook Form */}
        <div className="rounded-2xl bg-white/70 p-6 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <RebookForm bookingId={bookingId} />
        </div>
      </div>
    </div>
  );
}
