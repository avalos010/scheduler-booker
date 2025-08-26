import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { formatTime } from "@/lib/utils/serverTimeFormat";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load working hours for the authenticated user
    const { data, error } = await supabase
      .from("user_working_hours")
      .select("*")
      .eq("user_id", user.id)
      .order("day_of_week");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Fetch user's time format preference from database
    const { data: userSettings } = await supabase
      .from("user_availability_settings")
      .select("time_format_12h")
      .eq("user_id", user.id)
      .single();

    const shouldUse12HourFormat = userSettings?.time_format_12h || false;

    // Format display times if user prefers 12-hour format
    if (shouldUse12HourFormat && data) {
      data.forEach((workingHour: any) => {
        workingHour.start_time_display = formatTime(
          workingHour.start_time,
          false
        );
        workingHour.end_time_display = formatTime(workingHour.end_time, false);
      });
    }

    return NextResponse.json({ workingHours: data });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { workingHours } = body;

    if (!workingHours || !Array.isArray(workingHours)) {
      return NextResponse.json(
        { error: "Missing or invalid workingHours array" },
        { status: 400 }
      );
    }

    // Delete existing working hours for this user
    const { error: deleteError } = await supabase
      .from("user_working_hours")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Insert new working hours
    if (workingHours.length > 0) {
      const hoursToInsert = workingHours.map(
        (hour: {
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_working: boolean;
        }) => ({
          user_id: user.id,
          day_of_week: hour.day_of_week,
          start_time: hour.start_time,
          end_time: hour.end_time,
          is_working: hour.is_working,
        })
      );

      const { error: insertError } = await supabase
        .from("user_working_hours")
        .insert(hoursToInsert);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving working hours:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
