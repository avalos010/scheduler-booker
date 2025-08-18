import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

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

    // Load settings for the authenticated user
    const { data, error } = await supabase
      .from("user_availability_settings")
      .select("*")
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ settings: data });
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
    const { settings } = body;

    if (!settings) {
      return NextResponse.json(
        { error: "Missing settings data" },
        { status: 400 }
      );
    }

    // Check if settings already exist for this user
    const { data: existingSettings } = await supabase
      .from("user_availability_settings")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from("user_availability_settings")
        .update({
          slot_duration_minutes: settings.slot_duration_minutes,
          break_duration_minutes: settings.break_duration_minutes,
          advance_booking_days: settings.advance_booking_days,
        })
        .eq("user_id", user.id);

      if (updateError) {
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
    } else {
      // Insert new settings
      const { error: insertError } = await supabase
        .from("user_availability_settings")
        .insert({
          user_id: user.id,
          slot_duration_minutes: settings.slot_duration_minutes,
          break_duration_minutes: settings.break_duration_minutes,
          advance_booking_days: settings.advance_booking_days,
        });

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
