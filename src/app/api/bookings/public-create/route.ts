import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase-server";
import { convertTimeToTimestamp } from "@/lib/utils/serverTimeFormat";
import { sendNewBookingRequestNotification } from "@/lib/email/booking-notifications";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: NextRequest) {
  try {
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

    const supabase = createSupabaseServiceClient();

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
      throw error;
    }

    try {
      const { data: schedulerData, error: schedulerLookupError } =
        await supabase.auth.admin.getUserById(userId);

      if (schedulerLookupError) {
        throw schedulerLookupError;
      }

      const scheduler = schedulerData.user;
      if (scheduler?.email) {
        await sendNewBookingRequestNotification({
          bookingId: data.id,
          schedulerEmail: scheduler.email,
          schedulerName:
            scheduler.user_metadata?.business_name ||
            scheduler.user_metadata?.display_name,
          clientName,
          clientEmail,
          date,
          startTime: startTimestamp,
          endTime: endTimestamp,
          notes,
        });
      }
    } catch (notificationError) {
      Sentry.captureException(notificationError, {
        tags: {
          route: "bookings/public-create/POST",
          type: "booking-notification",
        },
      });
      console.error(
        "Booking was created, but the owner notification failed:",
        notificationError
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
    Sentry.captureException(error, {
      tags: { route: "bookings/public-create/POST", type: "server" },
    });
    console.error("Internal server error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
