import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing startDate or endDate" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load exceptions for the date range
    const { data: exceptions, error: exceptionsError } = await supabase
      .from("user_availability_exceptions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate);

    if (exceptionsError) {
      return NextResponse.json(
        { error: exceptionsError.message },
        { status: 500 }
      );
    }

    // Load time slots for the date range
    const { data: timeSlots, error: slotsError } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date, start_time");

    if (slotsError) {
      return NextResponse.json({ error: slotsError.message }, { status: 500 });
    }

    return NextResponse.json({
      exceptions: exceptions || [],
      timeSlots: timeSlots || [],
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
