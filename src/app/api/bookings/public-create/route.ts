import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { convertTimeToTimestamp } from "@/lib/utils/serverTimeFormat";

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServiceClient();
    const body = await request.json();

    const {
      userId,
      date,
      startTime,
      endTime,
      clientName,
      clientEmail,
      clientPhone,
      notes,
    } = body;

    if (
      !userId ||
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

    // Convert time strings to full timestamps
    const startTimestamp = convertTimeToTimestamp(date, startTime);
    const endTimestamp = convertTimeToTimestamp(date, endTime);

    // Since we are using the service role, we can bypass RLS to insert the booking.
    // This is safe because we are on the server and have validated the input.
    const { data, error } = await supabase
      .from("bookings")
      .insert([
        {
          user_id: userId,
          date,
          start_time: startTimestamp,
          end_time: endTimestamp,
          client_name: clientName,
          client_email: clientEmail,
          client_phone: clientPhone,
          notes,
          status: "pending", // All public bookings are pending by default
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating booking:", error);
      return NextResponse.json(
        { message: "Error creating booking", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: "Booking created successfully",
        booking: data,
        accessToken: data.access_token, // Return access token for secure link
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
