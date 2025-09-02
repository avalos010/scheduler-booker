import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";

// Helper function to convert time string to full timestamp
function convertTimeToTimestamp(date: string, timeString: string): string {
  // If timeString is already a full timestamp, return it
  if (timeString.includes("T") && timeString.includes("+")) {
    return timeString;
  }

  // Handle different time formats
  let formattedTime = timeString;

  // If it's just "HH:mm", add seconds
  if (/^\d{2}:\d{2}$/.test(timeString)) {
    formattedTime = `${timeString}:00`;
  }
  // If it's "HH:mm:ss", use as is
  else if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
    formattedTime = timeString;
  }

  return `${date}T${formattedTime}+00:00`;
}

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
    const { data, error } = await supabase.from("bookings").insert([
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
    ]);

    if (error) {
      console.error("Error creating booking:", error);
      return NextResponse.json(
        { message: "Error creating booking", error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: "Booking created successfully", data },
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
