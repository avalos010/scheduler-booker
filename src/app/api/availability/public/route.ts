import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  extractTimeFromTimestamp,
  formatTime,
} from "@/lib/utils/serverTimeFormat";

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

    // Fetch user's time format preference
    const { data: userSettings } = await supabase
      .from("user_availability_settings")
      .select("time_format_12h")
      .eq("user_id", userId)
      .single();

    const shouldUse12HourFormat = userSettings?.time_format_12h || false;

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

    // Note: Do not early-return with custom slots. We'll first generate slots
    // from working hours and then overlay custom slots to match private endpoint behavior.

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
      startTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
      endTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
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

    // Extract time portion from timestamp (e.g., "2025-09-04T09:00:00+00:00" -> "09:00:00")
    const startTimeStr = extractTimeFromTimestamp(workingHours.start_time);
    const endTimeStr = extractTimeFromTimestamp(workingHours.end_time);

    let currentTime = new Date(`2000-01-01T${startTimeStr}`);
    const endTime = new Date(`2000-01-01T${endTimeStr}`);

    while (currentTime < endTime) {
      const slotStart = currentTime.toTimeString().slice(0, 5);
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000)
        .toTimeString()
        .slice(0, 5);

      if (new Date(`2000-01-01T${slotEnd}`) <= endTime) {
        const timeSlot = {
          id: `${userId}-${date}-${slotStart}-${slotEnd}`,
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true,
          isBooked: false,
          ...(shouldUse12HourFormat && {
            startTimeDisplay: formatTime(slotStart, false), // false = 12-hour format
            endTimeDisplay: formatTime(slotEnd, false),
          }),
        };

        timeSlots.push(timeSlot);
      }

      currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }

    // Overlay any custom time slots (exceptions)
    if (customTimeSlots && customTimeSlots.length > 0) {
      customTimeSlots.forEach((customSlot) => {
        const startTime = extractTimeFromTimestamp(customSlot.start_time);
        const endTime = extractTimeFromTimestamp(customSlot.end_time);

        const existingIndex = timeSlots.findIndex(
          (s) => s.startTime === startTime && s.endTime === endTime
        );

        if (existingIndex !== -1) {
          // Update availability on existing generated slot
          timeSlots[existingIndex].isAvailable =
            customSlot.is_available !== false && !customSlot.is_booked;
          timeSlots[existingIndex].isBooked = customSlot.is_booked || false;
        } else {
          // Add custom-only slot not present in generated set
          const added = {
            id: `${userId}-${date}-${startTime}-${endTime}`,
            startTime,
            endTime,
            isAvailable:
              customSlot.is_available !== false && !customSlot.is_booked,
            isBooked: customSlot.is_booked || false,
          } as (typeof timeSlots)[number];

          if (shouldUse12HourFormat) {
            added.startTimeDisplay = formatTime(startTime, false);
            added.endTimeDisplay = formatTime(endTime, false);
          }

          timeSlots.push(added);
        }
      });
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
        const booking = existingBookings.find((b) => {
          const bookingStartTime = extractTimeFromTimestamp(b.start_time);
          const bookingEndTime = extractTimeFromTimestamp(b.end_time);
          return (
            bookingStartTime === slot.startTime &&
            bookingEndTime === slot.endTime
          );
        });
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
