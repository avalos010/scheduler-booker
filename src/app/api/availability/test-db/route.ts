import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Test basic connection
    const { error: testError } = await supabase
      .from("user_availability_settings")
      .select("count")
      .limit(1);

    if (testError) {
      return NextResponse.json(
        { error: "Database connection failed", details: testError },
        { status: 500 }
      );
    }

    // Get table counts
    const [settingsCount, hoursCount, exceptionsCount, slotsCount] =
      await Promise.all([
        supabase
          .from("user_availability_settings")
          .select("count", { count: "exact" }),
        supabase.from("user_working_hours").select("count", { count: "exact" }),
        supabase
          .from("user_availability_exceptions")
          .select("count", { count: "exact" }),
        supabase.from("user_time_slots").select("count", { count: "exact" }),
      ]);

    // Get sample data
    const [sampleSettings, sampleHours] = await Promise.all([
      supabase.from("user_availability_settings").select("*").limit(3),
      supabase.from("user_working_hours").select("*").limit(3),
    ]);

    return NextResponse.json({
      success: true,
      connection: "OK",
      tableCounts: {
        settings: settingsCount.count || 0,
        workingHours: hoursCount.count || 0,
        exceptions: exceptionsCount.count || 0,
        timeSlots: slotsCount.count || 0,
      },
      sampleData: {
        settings: sampleSettings.data || [],
        workingHours: sampleHours.data || [],
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Test DB error:", error);
    return NextResponse.json(
      { error: "Test failed", details: error },
      { status: 500 }
    );
  }
}
