import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    // Get the authenticated user from shared server-side Supabase client
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch bookings for the user within the date range
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (bookingsError) {
      throw bookingsError;
    }

    // Group bookings by date
    const bookingsByDate: Record<
      string,
      {
        id: string;
        date: string;
        start_time: string;
        end_time: string;
        client_name: string;
        client_email: string;
        client_phone?: string;
        notes?: string;
        status: string;
        created_at: string;
        updated_at: string;
      }[]
    > = {};
    bookings?.forEach((booking) => {
      const dateKey = booking.date;
      if (!bookingsByDate[dateKey]) {
        bookingsByDate[dateKey] = [];
      }
      bookingsByDate[dateKey].push({
        id: booking.id,
        date: booking.date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        client_name: booking.client_name,
        client_email: booking.client_email,
        client_phone: booking.client_phone ?? undefined,
        notes: booking.notes ?? undefined,
        status: booking.status,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
      });
    });

    return NextResponse.json({ bookings: bookingsByDate });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "availability/bookings-for-month/GET", type: "server" },
    });
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
