import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get session to verify user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const {
      userId,
      date,
      startTime,
      endTime,
      clientName,
      clientEmail,
      clientPhone,
      notes,
    } = await request.json();

    // Verify the user is booking for themselves
    if (session.user.id !== userId) {
      return NextResponse.json(
        { message: "Unauthorized to book for this user" },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!date || !startTime || !endTime || !clientName || !clientEmail) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if the time slot is still available
    const { data: timeSlot, error: timeSlotError } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .eq("start_time", startTime)
      .eq("end_time", endTime)
      .eq("is_available", true)
      .eq("is_booked", false)
      .single();

    if (timeSlotError || !timeSlot) {
      return NextResponse.json(
        { message: "Time slot is no longer available" },
        { status: 409 }
      );
    }

    // Create the booking record
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: userId,
        date,
        start_time: startTime,
        end_time: endTime,
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
      .eq("id", timeSlot.id);

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

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Get session to verify user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || session.user.id !== userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 403 });
    }

    // Get all bookings for the user
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Error fetching bookings:", error);
      return NextResponse.json(
        { message: "Error fetching bookings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ bookings });
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

    // Get session to verify user is authenticated
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
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
      .select("user_id, status")
      .eq("id", bookingId)
      .single();

    if (fetchError || !existingBooking) {
      return NextResponse.json(
        { message: "Booking not found" },
        { status: 404 }
      );
    }

    if (existingBooking.user_id !== session.user.id) {
      return NextResponse.json(
        { message: "Unauthorized to modify this booking" },
        { status: 403 }
      );
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
        .eq("user_id", session.user.id)
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
        .eq("user_id", session.user.id)
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
