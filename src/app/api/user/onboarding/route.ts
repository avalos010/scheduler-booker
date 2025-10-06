import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      userType,
      businessName,
      businessType,
      name,
      timezone,
      workDays,
      startTime,
      endTime,
      timeSlotDuration,
      timeFormat12h,
    } = body;

    // Validate required fields
    if (
      !userType ||
      !name ||
      !timezone ||
      !workDays ||
      !startTime ||
      !endTime ||
      !timeSlotDuration ||
      timeFormat12h === undefined
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Start a transaction-like approach by saving availability settings first
    const { error: settingsError } = await supabase
      .from("user_availability_settings")
      .upsert(
        {
          user_id: user.id,
          slot_duration_minutes: timeSlotDuration,
          timezone: timezone,
          time_format_12h: timeFormat12h,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      );

    if (settingsError) {
      console.error("Error saving availability settings:", settingsError);
      return NextResponse.json(
        { error: "Failed to save availability settings" },
        { status: 500 }
      );
    }

    // Convert work days to day_of_week format (0=Sunday, 1=Monday, etc.)
    const dayMapping: { [key: string]: number } = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    // Prepare working hours data
    const workingHours = workDays.map((day: string) => ({
      user_id: user.id,
      day_of_week: dayMapping[day],
      start_time: startTime,
      end_time: endTime,
      timezone: timezone,
      is_working: true,
    }));

    // Delete existing working hours for this user
    const { error: deleteError } = await supabase
      .from("user_working_hours")
      .delete()
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("Error deleting existing working hours:", deleteError);
      return NextResponse.json(
        { error: "Failed to update working hours" },
        { status: 500 }
      );
    }

    // Insert new working hours
    if (workingHours.length > 0) {
      const { error: insertError } = await supabase
        .from("user_working_hours")
        .insert(workingHours);

      if (insertError) {
        console.error("Error inserting working hours:", insertError);
        return NextResponse.json(
          { error: "Failed to save working hours" },
          { status: 500 }
        );
      }
    }

    // Update user metadata with profile information
    const { error: metadataError } = await supabase.auth.updateUser({
      data: {
        onboarded: true,
        user_type: userType,
        business_name: businessName || null,
        business_type: businessType || null,
        display_name: name,
      },
    });

    if (metadataError) {
      console.error("Error updating user metadata:", metadataError);
      return NextResponse.json(
        { error: "Failed to update user profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in onboarding API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
