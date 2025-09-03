import { createSupabaseServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

/**
 * Converts a time string (e.g., "09:30") to a full timestamp for the given date
 * @param date - The date string (e.g., "2025-01-15")
 * @param timeString - The time string (e.g., "09:30")
 * @returns Full timestamp string (e.g., "2025-01-15T09:30:00+00:00")
 */
function convertTimeToTimestamp(date: string, timeString: string): string {
  console.log("🔥 convertTimeToTimestamp called with:", { date, timeString });

  // Check if timeString is already a full timestamp
  if (timeString.includes("T") && timeString.includes("+")) {
    console.log("🔥 timeString is already a timestamp, returning as-is");
    return timeString;
  }

  // Ensure time string has seconds if not provided
  const timeWithSeconds =
    timeString.includes(":") && timeString.split(":").length === 2
      ? `${timeString}:00`
      : timeString;

  // Create full timestamp
  const result = `${date}T${timeWithSeconds}+00:00`;
  console.log("🔥 convertTimeToTimestamp result:", result);
  return result;
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
    const { date, timeSlots } = body;

    if (!date || !timeSlots) {
      return NextResponse.json(
        { error: "Missing date or timeSlots" },
        { status: 400 }
      );
    }

    // Delete existing time slots for this date
    const { error: deleteError } = await supabase
      .from("user_time_slots")
      .delete()
      .eq("user_id", user.id)
      .eq("date", date);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Insert new time slots
    if (timeSlots.length > 0) {
      const slotsToInsert = timeSlots.map(
        (slot: {
          start_time: string;
          end_time: string;
          is_available: boolean;
          is_booked?: boolean;
        }) => ({
          user_id: user.id,
          date,
          start_time: convertTimeToTimestamp(date, slot.start_time),
          end_time: convertTimeToTimestamp(date, slot.end_time),
          is_available: slot.is_available,
          is_booked: slot.is_booked || false,
        })
      );

      const { error: insertError } = await supabase
        .from("user_time_slots")
        .insert(slotsToInsert);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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
    const { date, start_time, end_time, is_available } = body;

    if (!date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Missing date, start_time, or end_time" },
        { status: 400 }
      );
    }

    // Convert time strings to full timestamps for the query
    const startTimestamp = convertTimeToTimestamp(date, start_time);
    const endTimestamp = convertTimeToTimestamp(date, end_time);

    console.log("🔥 PUT request - looking for existing slot:", {
      date,
      start_time,
      end_time,
      startTimestamp,
      endTimestamp,
    });

    // First, let's see what's actually in the database for this date
    const { data: allSlotsForDate, error: allSlotsError } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date);

    console.log("🔥 PUT request - all slots for date:", {
      allSlotsForDate: allSlotsForDate?.map((slot) => ({
        id: slot.id,
        start_time: slot.start_time,
        end_time: slot.end_time,
        is_available: slot.is_available,
      })),
    });

    // First, try to find the existing time slot
    const { data: existingSlot, error: findError } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", user.id)
      .eq("date", date)
      .eq("start_time", startTimestamp)
      .eq("end_time", endTimestamp)
      .single();

    console.log("🔥 PUT request - existing slot search result:", {
      existingSlot,
      findError: findError?.code,
    });

    if (findError && findError.code !== "PGRST116") {
      // PGRST116 is "not found" error, which is expected if slot doesn't exist
      return NextResponse.json({ error: findError.message }, { status: 500 });
    }

    if (existingSlot) {
      // Update existing time slot
      console.log("🔥 PUT request - updating existing slot:", existingSlot.id);
      const { error: updateError } = await supabase
        .from("user_time_slots")
        .update({ is_available })
        .eq("id", existingSlot.id);

      if (updateError) {
        console.log("🔥 PUT request - update error:", updateError);
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }
      console.log("🔥 PUT request - slot updated successfully");
    } else {
      // Create new time slot if it doesn't exist
      console.log("🔥 PUT request - creating new slot:", {
        user_id: user.id,
        date,
        start_time: startTimestamp,
        end_time: endTimestamp,
        is_available,
      });
      const { error: insertError } = await supabase
        .from("user_time_slots")
        .insert({
          user_id: user.id,
          date,
          start_time: startTimestamp,
          end_time: endTimestamp,
          is_available,
          is_booked: false,
        });

      if (insertError) {
        console.log("🔥 PUT request - insert error:", insertError);
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
      console.log("🔥 PUT request - slot created successfully");
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
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

    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let query = supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", user.id);

    if (date) {
      query = query.eq("date", date);
    } else if (startDate && endDate) {
      query = query.gte("date", startDate).lte("date", endDate);
    }

    const { data, error } = await query.order("date, start_time");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data,
      count: data?.length || 0,
      user: user.id,
      query: { date, startDate, endDate },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
