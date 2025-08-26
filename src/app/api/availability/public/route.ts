import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const userId = searchParams.get("userId");

  try {
    if (!date || !userId) {
      return NextResponse.json(
        { message: "Missing required parameters" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();

    // Get working hours for the day
    // Note: getDay() returns 0-6 (Sunday-Saturday), but our database uses 1-7 (Monday-Sunday)
    const jsDayOfWeek = new Date(date).getDay();
    const dayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek; // Convert Sunday=0 to Sunday=7

    console.log(
      `🔍 Checking availability for user ${userId}, date ${date}, JS day: ${jsDayOfWeek}, DB day: ${dayOfWeek}`
    );

    // First, let's check what working hours exist for this user
    const { data: allWorkingHours, error: allWorkingHoursError } =
      await supabase
        .from("user_working_hours")
        .select("*")
        .eq("user_id", userId);

    console.log(`🔍 All working hours for user:`, {
      allWorkingHours,
      allWorkingHoursError,
      count: allWorkingHours?.length || 0,
    });

    const { data: workingHours, error: workingHoursError } = await supabase
      .from("user_working_hours")
      .select("*")
      .eq("user_id", userId)
      .eq("day_of_week", dayOfWeek)
      .single();

    console.log(`🔍 Working hours for day ${dayOfWeek}:`, {
      workingHours,
      workingHoursError,
    });

    // Check for custom time slots/exceptions for this specific date
    // These can override the default working hours
    const { data: customTimeSlots, error: timeSlotsError } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("start_time");

    console.log(`🔍 Custom time slots for ${date}:`, {
      customTimeSlots,
      timeSlotsError,
      count: customTimeSlots?.length || 0,
    });

    // If we have custom time slots for this date, use those instead of working hours
    if (customTimeSlots && customTimeSlots.length > 0) {
      console.log(`🔍 Using custom time slots for ${date}`);

      const timeSlots: Array<{
        id: string;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
        isBooked: boolean;
        bookingStatus?: string;
        bookingDetails?: {
          clientName: string;
          clientEmail: string;
          notes?: string;
          status: string;
        };
      }> = customTimeSlots.map((slot) => ({
        id: `${userId}-${date}-${slot.start_time}-${slot.end_time}`,
        startTime: slot.start_time,
        endTime: slot.end_time,
        isAvailable: slot.is_available !== false, // Default to available unless explicitly set to false
        isBooked: false, // Will check bookings below
      }));

      // Check for existing bookings and mark slots as unavailable
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select(
          "start_time, end_time, status, client_name, client_email, notes"
        )
        .eq("user_id", userId)
        .eq("date", date)
        .in("status", ["confirmed", "pending"]);

      if (existingBookings) {
        timeSlots.forEach((slot) => {
          const booking = existingBookings.find(
            (booking) =>
              booking.start_time === slot.startTime &&
              booking.end_time === slot.endTime
          );
          if (booking) {
            slot.isAvailable = false;
            slot.isBooked = true;
            // DO NOT include booking details in the public response
            // slot.bookingStatus = booking.status;
            // slot.bookingDetails = {
            //   clientName: booking.client_name,
            //   clientEmail: booking.client_email,
            //   notes: booking.notes,
            //   status: booking.status,
            // };
          }
        });
      }

      return NextResponse.json({
        date: new Date(date),
        timeSlots,
        isWorkingDay: true,
        source: "custom_time_slots",
        message: `Found ${timeSlots.length} custom time slots for this date`,
      });
    }

    // If no working hours found or not a working day, return empty slots
    if (workingHoursError || !workingHours || !workingHours.is_working) {
      console.log(
        `🔍 No working hours for day ${dayOfWeek}, returning empty slots`
      );
      return NextResponse.json({
        date: new Date(date),
        timeSlots: [],
        isWorkingDay: false,
        message: "No working hours configured for this day",
      });
    }

    // Get availability settings
    const { data: settings } = await supabase
      .from("user_availability_settings")
      .select("slot_duration_minutes")
      .eq("user_id", userId)
      .single();

    // If no settings found, use default 60-minute slots
    // If there's an error, also use default (don't fail the request)
    const slotDuration = settings?.slot_duration_minutes || 60;

    // Generate time slots
    const timeSlots: Array<{
      id: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
      isBooked: boolean;
      bookingStatus?: string;
      bookingDetails?: {
        clientName: string;
        clientEmail: string;
        notes?: string;
        status: string;
      };
    }> = [];
    let currentTime = new Date(`2000-01-01T${workingHours.start_time}`);
    const endTime = new Date(`2000-01-01T${workingHours.end_time}`);

    while (currentTime < endTime) {
      const slotStart = currentTime.toTimeString().slice(0, 5);
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000)
        .toTimeString()
        .slice(0, 5);

      if (new Date(`2000-01-01T${slotEnd}`) <= endTime) {
        timeSlots.push({
          id: `${userId}-${date}-${slotStart}-${slotEnd}`,
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
          isBooked: false,
        });
      }

      currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }

    // Check for existing bookings and mark slots as unavailable
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, end_time, status, client_name, client_email, notes")
      .eq("user_id", userId)
      .eq("date", date)
      .in("status", ["confirmed", "pending"]);

    if (existingBookings) {
      timeSlots.forEach((slot) => {
        const booking = existingBookings.find(
          (booking) =>
            booking.start_time === slot.startTime &&
            booking.end_time === slot.endTime
        );
        if (booking) {
          slot.isAvailable = false;
          slot.isBooked = true;
          // DO NOT include booking details in the public response
          // slot.bookingStatus = booking.status;
          // slot.bookingDetails = {
          //   clientName: booking.client_name,
          //   clientEmail: booking.client_email,
          //   notes: booking.notes,
          //   status: booking.status,
          // };
        }
      });
    }

    return NextResponse.json({
      date: new Date(date),
      timeSlots,
      isWorkingDay: true,
    });
  } catch (error) {
    console.error("Error in public availability:", error);
    console.error("Request params:", { date, userId });
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
