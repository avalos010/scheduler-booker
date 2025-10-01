import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  formatTime,
  extractTimeFromTimestamp,
  convertTimeToTimestamp,
} from "@/lib/utils/serverTimeFormat";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get user to verify authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      timeSlotId,
      date,
      startTime,
      endTime,
      clientName,
      clientEmail,
      clientPhone,
      notes,
    } = await request.json();

    console.log("🔥 Booking request received:", {
      timeSlotId,
      date,
      startTime,
      endTime,
      clientName,
      clientEmail,
      clientPhone,
      notes,
    });

    // Validate required fields
    if (
      !timeSlotId ||
      !date ||
      !startTime ||
      !endTime ||
      !clientName ||
      !clientEmail
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Try to parse the timeSlotId to extract date and time information
    // Format: ${userId}-${date}-${startTime}-${endTime} or slot-${startTime}-${endTime}
    const timeSlotParts: string[] = timeSlotId.split("-");

    console.log("🔥 Parsing timeSlotId:", {
      timeSlotId,
      timeSlotParts,
      length: timeSlotParts.length,
    });

    let timeSlot: Record<string, unknown> | null = null;
    let timeSlotError: { code?: string; message?: string } | null = null;

    if (timeSlotId.startsWith("slot-") && timeSlotParts.length >= 3) {
      // Format: slot-${startTime}-${endTime}
      // Use the provided date from the request instead of hardcoding today's date
      const slotStartTime = timeSlotParts[1];
      const slotEndTime = timeSlotParts[2];

      // Convert time strings to timestamps for database lookup
      const startTimestamp = convertTimeToTimestamp(date, slotStartTime);
      const endTimestamp = convertTimeToTimestamp(date, slotEndTime);

      // Get the time slot details and verify it belongs to the user
      const result = await supabase
        .from("user_time_slots")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .eq("start_time", startTimestamp)
        .eq("end_time", endTimestamp)
        .single();

      timeSlot = result.data;
      timeSlotError = result.error;
    } else if (timeSlotParts.length >= 4) {
      // Format: ${userId}-${date}-${startTime}-${endTime}
      const date = timeSlotParts.slice(1, -2).join("-"); // Handle dates with hyphens
      const startTime = timeSlotParts[timeSlotParts.length - 2];
      const endTime = timeSlotParts[timeSlotParts.length - 1];

      // Convert time strings to timestamps for database lookup
      const startTimestamp = convertTimeToTimestamp(date, startTime);
      const endTimestamp = convertTimeToTimestamp(date, endTime);

      // Get the time slot details and verify it belongs to the user
      const result = await supabase
        .from("user_time_slots")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .eq("start_time", startTimestamp)
        .eq("end_time", endTimestamp)
        .single();

      timeSlot = result.data;
      timeSlotError = result.error;
    } else {
      // Fallback: try to find by ID directly (for test cases with simple IDs like "slot-1")
      const result = await supabase
        .from("user_time_slots")
        .select("*")
        .eq("id", timeSlotId)
        .eq("user_id", user.id)
        .single();

      timeSlot = result.data;
      timeSlotError = result.error;
    }

    if (timeSlotError || !timeSlot) {
      // If the time slot doesn't exist, it might be a generated slot from working hours
      // Let's try to create it if we can parse the timeSlotId
      if (timeSlotId.startsWith("slot-") && timeSlotParts.length >= 3) {
        // Format: slot-${startTime}-${endTime}
        const slotStartTime = timeSlotParts[1];
        const slotEndTime = timeSlotParts[2];
        // Use the provided date from the request instead of hardcoding today's date

        // Convert time strings to timestamps
        const startTimestamp = convertTimeToTimestamp(date, slotStartTime);
        const endTimestamp = convertTimeToTimestamp(date, slotEndTime);

        // Create the time slot
        const { data: newTimeSlot, error: createError } = await supabase
          .from("user_time_slots")
          .insert({
            user_id: user.id,
            date,
            start_time: startTimestamp,
            end_time: endTimestamp,
            is_available: true,
            is_booked: false,
          })
          .select()
          .single();

        if (createError || !newTimeSlot) {
          console.error("Error creating time slot:", createError);
          return NextResponse.json(
            { message: "Time slot not found and could not be created" },
            { status: 404 }
          );
        }

        timeSlot = newTimeSlot;
      } else if (timeSlotParts.length >= 4) {
        // Format: ${userId}-${date}-${startTime}-${endTime}
        // Since userId can contain hyphens (UUIDs), we need to extract from the end
        const startTime = timeSlotParts[timeSlotParts.length - 2];
        const endTime = timeSlotParts[timeSlotParts.length - 1];

        // Find the date by looking for the pattern YYYY-MM-DD
        // The date should be the 3 parts before startTime and endTime
        const dateParts = timeSlotParts.slice(-5, -2); // Get the 3 parts before startTime/endTime
        const date = dateParts.join("-");

        // The userId is everything before the date
        const userId = timeSlotParts.slice(0, -5).join("-");

        console.log("🔥 Parsed userId-date format:", {
          date,
          startTime,
          endTime,
          userId,
          originalTimeSlotId: timeSlotId,
        });

        // Convert time strings to timestamps
        const startTimestamp = convertTimeToTimestamp(date, startTime);
        const endTimestamp = convertTimeToTimestamp(date, endTime);

        console.log("🔥 Converted timestamps (userId-date format):", {
          startTimestamp,
          endTimestamp,
        });

        // Create the time slot
        console.log("🔥 Creating time slot (userId-date format) with data:", {
          user_id: user.id,
          date,
          start_time: startTimestamp,
          end_time: endTimestamp,
          is_available: true,
          is_booked: false,
        });

        const { data: newTimeSlot, error: createError } = await supabase
          .from("user_time_slots")
          .insert({
            user_id: user.id,
            date,
            start_time: startTimestamp,
            end_time: endTimestamp,
            is_available: true,
            is_booked: false,
          })
          .select()
          .single();

        console.log("🔥 Time slot creation result (userId-date format):", {
          newTimeSlot,
          createError,
        });

        if (createError || !newTimeSlot) {
          console.error("Error creating time slot:", createError);
          return NextResponse.json(
            { message: "Time slot not found and could not be created" },
            { status: 404 }
          );
        }

        timeSlot = newTimeSlot;
      } else {
        return NextResponse.json(
          { message: "Time slot not found or unauthorized" },
          { status: 404 }
        );
      }
    }

    if (!timeSlot || !timeSlot.is_available || timeSlot.is_booked) {
      return NextResponse.json(
        { message: "Time slot is not available for booking" },
        { status: 409 }
      );
    }

    // Create the booking record
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        date: date,
        start_time: convertTimeToTimestamp(date, startTime),
        end_time: convertTimeToTimestamp(date, endTime),
        client_name: clientName,
        client_email: clientEmail,
        client_phone: clientPhone || null,
        notes: notes || null,
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Error creating booking:", bookingError);
      return NextResponse.json(
        { message: "Error creating booking" },
        { status: 500 }
      );
    }

    // Update the time slot to mark it as booked
    const { error: updateError } = await supabase
      .from("user_time_slots")
      .update({
        is_booked: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", timeSlot!.id);

    if (updateError) {
      console.error("Error updating time slot:", updateError);
      // Note: We don't fail the request here as the booking was created
      // The time slot will be updated in a background process if needed
    }

    return NextResponse.json({
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Error in booking creation:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get user to verify authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Fetch user's time format preference
    const { data: userSettings } = await supabase
      .from("user_availability_settings")
      .select("time_format_12h")
      .eq("user_id", user.id)
      .single();

    const shouldUse12HourFormat = userSettings?.time_format_12h || false;

    // Get all bookings for the user
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json(
        { message: "Error fetching bookings" },
        { status: 500 }
      );
    }

    // Format the booking times based on user preference
    const formattedBookings =
      bookings?.map((booking) => {
        // Extract time portion from timestamp (e.g., "2025-08-27T09:00:00+00:00" -> "09:00:00")
        const startTime = extractTimeFromTimestamp(booking.start_time);
        const endTime = extractTimeFromTimestamp(booking.end_time);

        return {
          ...booking,
          startTimeDisplay: shouldUse12HourFormat
            ? formatTime(startTime, false) // false = 12-hour format
            : formatTime(startTime, true), // true = 24-hour format
          endTimeDisplay: shouldUse12HourFormat
            ? formatTime(endTime, false)
            : formatTime(endTime, true),
        };
      }) || [];

    return NextResponse.json({ bookings: formattedBookings });
  } catch (error) {
    console.error("Error in fetching bookings:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get user to verify authentication
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { bookingId, status } = await request.json();

    if (!bookingId || !status) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify the user owns this booking
    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("user_id, status, date, start_time, end_time")
      .eq("id", bookingId)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    if (existingBooking.user_id !== user.id) {
      return NextResponse.json(
        { message: "Unauthorized to modify this booking" },
        { status: 403 }
      );
    }

    // Prevent marking as no-show before the appointment start time + 15 minutes
    if (status === "no-show") {
      try {
        // existingBooking.start_time is now a full timestamp, so we can use it directly
        const startDateTime = new Date(existingBooking.start_time);
        const now = new Date();
        if (isNaN(startDateTime.getTime())) {
          return NextResponse.json(
            { message: "Invalid booking start time; cannot set no-show." },
            { status: 400 }
          );
        }
        const fifteenMinutesMs = 15 * 60 * 1000;
        const startWithGrace = new Date(
          startDateTime.getTime() + fifteenMinutesMs
        );
        if (now < startWithGrace) {
          return NextResponse.json(
            {
              message:
                "Cannot mark as no-show until 15 minutes after the start time.",
            },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { message: "Error validating appointment time for no-show." },
          { status: 400 }
        );
      }
    }

    // Prevent marking as completed before the appointment start time
    if (status === "completed") {
      try {
        // existingBooking.start_time is now a full timestamp, so we can use it directly
        const startDateTime = new Date(existingBooking.start_time);
        const now = new Date();
        if (isNaN(startDateTime.getTime())) {
          return NextResponse.json(
            { message: "Invalid booking start time; cannot mark completed." },
            { status: 400 }
          );
        }
        if (now < startDateTime) {
          return NextResponse.json(
            {
              message:
                "Cannot mark as completed before the appointment start time.",
            },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { message: "Error validating appointment time for completion." },
          { status: 400 }
        );
      }
    }

    // Update the booking status
    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating booking:", updateError);
      return NextResponse.json(
        { message: "Error updating booking" },
        { status: 500 }
      );
    }

    // If status is confirmed, update the time slot to booked
    if (status === "confirmed") {
      const { error: slotUpdateError } = await supabase
        .from("user_time_slots")
        .update({
          is_booked: true,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("date", updatedBooking.date)
        .eq("start_time", updatedBooking.start_time)
        .eq("end_time", updatedBooking.end_time);

      if (slotUpdateError) {
        console.error("Error updating time slot:", slotUpdateError);
        // Don't fail the request, just log the error
      }
    }

    // If status is cancelled, update the time slot back to available
    if (status === "cancelled") {
      const { error: slotUpdateError } = await supabase
        .from("user_time_slots")
        .update({
          is_booked: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id)
        .eq("date", updatedBooking.date)
        .eq("start_time", updatedBooking.start_time)
        .eq("end_time", updatedBooking.end_time);

      if (slotUpdateError) {
        console.error("Error updating time slot:", slotUpdateError);
        // Don't fail the request, just log the error
      }
    }

    return NextResponse.json({
      message: "Booking status updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error in updating booking:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");

    if (!bookingId) {
      return NextResponse.json(
        { message: "Missing bookingId" },
        { status: 400 }
      );
    }

    // Fetch the booking to verify ownership and get slot info
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, user_id, date, start_time, end_time")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { message: "Unauthorized to delete this booking" },
        { status: 403 }
      );
    }

    // Delete the booking
    const { error: deleteError } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);

    if (deleteError) {
      console.error("Error deleting booking:", deleteError);
      return NextResponse.json(
        { message: "Error deleting booking" },
        { status: 500 }
      );
    }

    // Free the time slot
    const { error: slotUpdateError } = await supabase
      .from("user_time_slots")
      .update({ is_booked: false, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("date", booking.date)
      .eq("start_time", booking.start_time)
      .eq("end_time", booking.end_time);

    if (slotUpdateError) {
      console.error("Error updating time slot after delete:", slotUpdateError);
      // Do not fail the request; just log
    }

    return NextResponse.json({ message: "Booking deleted" });
  } catch (error) {
    console.error("Error in deleting booking:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
