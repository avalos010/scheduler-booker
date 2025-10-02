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

    const { time_format_12h } = await request.json();

    if (typeof time_format_12h !== "boolean") {
      return NextResponse.json(
        { error: "Invalid time format value" },
        { status: 400 }
      );
    }

    // Update or insert user settings
    const { error } = await supabase.from("user_availability_settings").upsert(
      {
        user_id: user.id,
        time_format_12h,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      console.error("Error updating time format preference:", {
        error,
        userId: user.id,
        time_format_12h,
        errorCode: error.code,
        errorMessage: error.message,
        errorDetails: error.details,
      });
      return NextResponse.json(
        {
          error: "Failed to update preference",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in time format API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
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

    // Get user settings
    const { data: settings, error } = await supabase
      .from("user_availability_settings")
      .select("time_format_12h")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 is "no rows found"
      console.error("Error fetching time format preference:", error);
      return NextResponse.json(
        { error: "Failed to fetch preference" },
        { status: 500 }
      );
    }

    // Return default (24-hour format) if no settings found
    const timeFormat12h = settings?.time_format_12h || false;

    return NextResponse.json({ time_format_12h: timeFormat12h });
  } catch (error) {
    console.error("Error in time format API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
