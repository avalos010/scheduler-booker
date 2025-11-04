import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import {
  formatTime,
  extractTimeFromTimestamp,
} from "@/lib/utils/serverTimeFormat";
import * as Sentry from "@sentry/nextjs";
/**
 * Public endpoint to view booking details using access token
 * This allows clients to view/edit their bookings from email links
 * without requiring authentication
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { message: "Access token is required" },
        { status: 400 }
      );
    }

    // Fetch booking by access token (using service role to bypass RLS)
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("access_token", token)
      .single();

    if (error || !booking) {
      console.error("Error fetching booking:", error);
      return NextResponse.json(
        { message: "Booking not found or invalid access token" },
        { status: 404 }
      );
    }

    // Get user's time format preference for display
    const { data: userSettings } = await supabase
      .from("user_availability_settings")
      .select("time_format_12h")
      .eq("user_id", booking.user_id)
      .single();

    const shouldUse12HourFormat = userSettings?.time_format_12h || false;

    // Format the booking times based on user preference
    const startTime = extractTimeFromTimestamp(booking.start_time);
    const endTime = extractTimeFromTimestamp(booking.end_time);

    const formattedBooking = {
      ...booking,
      startTimeDisplay: shouldUse12HourFormat
        ? formatTime(startTime, false)
        : formatTime(startTime, true),
      endTimeDisplay: shouldUse12HourFormat
        ? formatTime(endTime, false)
        : formatTime(endTime, true),
      // Don't expose access_token in response for security
      access_token: undefined,
    };

    return NextResponse.json({ booking: formattedBooking }, { status: 200 });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "bookings/public-view/GET", type: "server" },
    });
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Public endpoint to update booking details using access token
 * Allows clients to update their own booking information
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await request.json();
    const { token, clientName, clientEmail, clientPhone, notes } = body;

    if (!token) {
      return NextResponse.json(
        { message: "Access token is required" },
        { status: 400 }
      );
    }

    // Verify the booking exists with this token
    const { data: existingBooking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, status")
      .eq("access_token", token)
      .single();

    if (fetchError || !existingBooking) {
      throw fetchError || new Error("Booking not found or invalid access token");
    }

    // Don't allow updates to cancelled or completed bookings
    if (
      existingBooking.status === "cancelled" ||
      existingBooking.status === "completed"
    ) {
      throw new Error("Cannot update a cancelled or completed booking");
    }

    // Update booking information
    const updateData: {
      client_name?: string;
      client_email?: string;
      client_phone?: string | null;
      notes?: string | null;
      updated_at: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (clientName !== undefined) updateData.client_name = clientName;
    if (clientEmail !== undefined) updateData.client_email = clientEmail;
    if (clientPhone !== undefined) updateData.client_phone = clientPhone;
    if (notes !== undefined) updateData.notes = notes;

    const { data: updatedBooking, error: updateError } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("access_token", token)
      .select()
      .single();

    if (updateError) {
      throw updateError;
      // console.error("Error updating booking:", updateError);
    }

    return NextResponse.json(
      {
        message: "Booking updated successfully",
        booking: { ...updatedBooking, access_token: undefined },
      },
      { status: 200 }
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "bookings/public-view/PATCH", type: "server" },
    });
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: "issue updating booking" },
      { status: 500 }
    );
  }
}

/**
 * Public endpoint to cancel a booking using access token
 * Allows clients to cancel their own bookings
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      throw new Error("Access token is required");
    }

    // Fetch the booking to verify it exists and get details
    const { data: booking, error: fetchError } = await supabase
      .from("bookings")
      .select("id, user_id, date, start_time, end_time, status")
      .eq("access_token", token)
      .single();

    if (fetchError || !booking) {
      throw fetchError || new Error("Booking not found or invalid access token");
    }

    // Don't allow cancellation of already cancelled or completed bookings
    if (booking.status === "cancelled") {
      throw new Error("Booking is already cancelled");
    }

    if (booking.status === "completed") {
      throw new Error("Booking is already completed");
    }

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("access_token", token);

    if (updateError) {
      throw updateError;
    }

    // Free up the time slot
    const { error: slotUpdateError } = await supabase
      .from("user_time_slots")
      .update({
        is_booked: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", booking.user_id)
      .eq("date", booking.date)
      .eq("start_time", booking.start_time)
      .eq("end_time", booking.end_time);

    if (slotUpdateError) {
      throw slotUpdateError;
    }

    return NextResponse.json(
      { message: "Booking cancelled successfully" },
      { status: 200 }
    );
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "bookings/public-view/DELETE", type: "server" },
    });
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
