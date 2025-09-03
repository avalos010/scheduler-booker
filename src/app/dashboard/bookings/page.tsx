import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import BookingForm from "@/components/bookings/BookingForm";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default async function BookingsPage() {
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
            { label: "Book Appointments" },
          ]}
        />
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-white/70 p-8 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Book Appointments
            </span>
          </h1>
          <p className="mt-2 text-gray-700">
            View your available time slots and create new bookings for clients.
          </p>
        </div>

        {/* Booking Form */}
        <div className="rounded-2xl bg-white/70 p-6 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <BookingForm />
        </div>
      </div>
    </div>
  );
}
