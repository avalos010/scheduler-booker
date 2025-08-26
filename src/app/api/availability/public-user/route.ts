import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Check if user has availability set up
    const { data: userSettings, error: settingsError } = await supabase
      .from("user_availability_settings")
      .select("*")
      .eq("user_id", userId);

    // Check if user has working hours set up
    const { data: workingHours, error: workingHoursError } = await supabase
      .from("user_working_hours")
      .select("*")
      .eq("user_id", userId);

    // Check if user has time slots set up
    const { data: timeSlots, error: timeSlotsError } = await supabase
      .from("user_time_slots")
      .select("user_id")
      .eq("user_id", userId)
      .limit(1);

    // Check if user exists in auth (basic check)
    const { data: userExists } = await supabase
      .from("user_availability_settings")
      .select("user_id")
      .eq("user_id", userId)
      .limit(1);

    const hasAvailability =
      (userSettings && userSettings.length > 0) ||
      (workingHours && workingHours.length > 0) ||
      (timeSlots && timeSlots.length > 0);

    return NextResponse.json({
      userId,
      hasAvailability,
      hasSettings: userSettings && userSettings.length > 0,
      hasWorkingHours: workingHours && workingHours.length > 0,
      hasTimeSlots: timeSlots && timeSlots.length > 0,
      settingsCount: userSettings?.length || 0,
      workingHoursCount: workingHours?.length || 0,
      timeSlotsCount: timeSlots?.length || 0,
      userExists: !!userExists && userExists.length > 0,
      errors: {
        settings: settingsError?.message,
        workingHours: workingHoursError?.message,
        timeSlots: timeSlotsError?.message,
      },
    });
  } catch (error) {
    console.error("Error in public user availability:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
