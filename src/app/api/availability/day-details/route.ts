import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { addMonths, startOfMonth } from "date-fns";
import { formatTime } from "@/lib/utils/serverTimeFormat";

type BookingDetails = {
  clientName: string;
  clientEmail: string;
  notes: string | null;
  status: string;
};

type ApiTimeSlot = {
  id: string;
  startTime: string;
  endTime: string;
  startTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
  endTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
  isAvailable: boolean;
  isBooked: boolean;
  bookingDetails?: BookingDetails;
};

// This endpoint is for authenticated users to fetch their own availability
// details, including private booking information.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");

  try {
    if (!date) {
      return NextResponse.json(
        { message: "Missing required date parameter" },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const userId = user.id;

    // Fetch user's time format preference from database
    const { data: userSettings } = await supabase
      .from("user_availability_settings")
      .select("time_format_12h")
      .eq("user_id", userId)
      .single();

    const shouldUse12HourFormat = userSettings?.time_format_12h || false;

    // Validate that the requested date is within the allowed booking range
    // (current month + first 15 days of next month)
    const requestedDate = new Date(date);
    const today = new Date();
    const currentMonthStart = startOfMonth(today);
    const nextMonth = addMonths(today, 1);
    const nextMonthStart = startOfMonth(nextMonth);
    const cutoffDate = new Date(nextMonthStart);
    cutoffDate.setDate(15); // 15th day of next month

    if (requestedDate < currentMonthStart || requestedDate > cutoffDate) {
      return NextResponse.json(
        {
          message:
            "Date is outside the allowed booking range. You can only view availability for the current month and the first 15 days of next month.",
        },
        { status: 400 }
      );
    }

    // Get working hours for the day
    const jsDayOfWeek = new Date(date).getDay();
    const dayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek;

    const { data: workingHours, error: workingHoursError } = await supabase
      .from("user_working_hours")
      .select("*")
      .eq("user_id", userId)
      .eq("day_of_week", dayOfWeek)
      .single();

    // Check for custom time slots for this specific date
    const { data: customTimeSlots } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("start_time");

    console.log(
      "🔥 CUSTOM TIME SLOTS FETCHED:",
      customTimeSlots?.length || 0,
      "slots"
    );

    // This logic is similar to the public one, but crucially, it WILL return booking details.
    if (customTimeSlots && customTimeSlots.length > 0) {
      console.log("🔥 USING CUSTOM TIME SLOTS PATH");
      const timeSlots: ApiTimeSlot[] = customTimeSlots.map((slot) => ({
        id: `${userId}-${date}-${slot.start_time}-${slot.end_time}`,
        startTime: slot.start_time,
        endTime: slot.end_time,
        isAvailable: slot.is_available !== false,
        isBooked: false,
      }));

      // Check for existing bookings to enrich the time slots
      const { data: existingBookings } = await supabase
        .from("bookings")
        .select(
          "start_time, end_time, status, client_name, client_email, notes"
        )
        .eq("user_id", userId)
        .eq("date", date);

      if (existingBookings) {
        timeSlots.forEach((slot) => {
          const booking = existingBookings.find(
            (b) =>
              b.start_time === slot.startTime && b.end_time === slot.endTime
          );
          if (booking) {
            // Only block the slot if booking is pending or confirmed
            const blocksSlot =
              booking.status === "pending" || booking.status === "confirmed";
            if (blocksSlot) {
              slot.isAvailable = false;
              slot.isBooked = true;
            }
            slot.bookingDetails = {
              clientName: booking.client_name,
              clientEmail: booking.client_email,
              notes: booking.notes,
              status: booking.status,
            };
          }
        });
      }

      // Apply time formatting for custom slots too
      console.log("🔥 Should format times?", shouldUse12HourFormat);
      if (shouldUse12HourFormat) {
        console.log(
          "🔥 Formatting times for",
          timeSlots.length,
          "custom slots"
        );
        timeSlots.forEach((slot) => {
          slot.startTimeDisplay = formatTime(slot.startTime, false); // false = 12-hour format
          slot.endTimeDisplay = formatTime(slot.endTime, false);
        });
        console.log(
          "🔥 Sample formatted custom slot:",
          timeSlots[0]
            ? {
                startTime: timeSlots[0].startTime,
                startTimeDisplay: timeSlots[0].startTimeDisplay,
              }
            : "No slots"
        );
      }

      console.log("🔥 RETURNING CUSTOM SLOTS RESPONSE WITH FORMATTING!");
      return NextResponse.json({
        date: new Date(date),
        timeSlots,
        isWorkingDay: true,
      });
    }

    // Default path if no custom slots (similar logic)
    console.log("🔥 USING WORKING HOURS PATH");
    if (workingHoursError || !workingHours || !workingHours.is_working) {
      return NextResponse.json({
        date: new Date(date),
        timeSlots: [],
        isWorkingDay: false,
      });
    }

    const { data: settings } = await supabase
      .from("user_availability_settings")
      .select("slot_duration_minutes")
      .eq("user_id", userId)
      .single();
    const slotDuration = settings?.slot_duration_minutes || 60;

    const timeSlots: ApiTimeSlot[] = [];
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

    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, end_time, status, client_name, client_email, notes")
      .eq("user_id", userId)
      .eq("date", date);

    if (existingBookings) {
      timeSlots.forEach((slot) => {
        const booking = existingBookings.find(
          (b) => b.start_time === slot.startTime && b.end_time === slot.endTime
        );
        if (booking) {
          slot.isAvailable = false;
          slot.isBooked = true;
          slot.bookingDetails = {
            clientName: booking.client_name,
            clientEmail: booking.client_email,
            notes: booking.notes,
            status: booking.status,
          };
        }
      });
    }

    console.log(
      "🔥 REACHED FORMATTING SECTION, timeSlots.length:",
      timeSlots.length
    );

    // Format display times if user prefers 12-hour format
    console.log("🔥 Should format times?", shouldUse12HourFormat);
    if (shouldUse12HourFormat) {
      console.log("🔥 Formatting times for", timeSlots.length, "slots");
      timeSlots.forEach((slot) => {
        slot.startTimeDisplay = formatTime(slot.startTime, false); // false = 12-hour format
        slot.endTimeDisplay = formatTime(slot.endTime, false);
      });
      console.log(
        "🔥 Sample formatted slot:",
        timeSlots[0]
          ? {
              startTime: timeSlots[0].startTime,
              startTimeDisplay: timeSlots[0].startTimeDisplay,
            }
          : "No slots"
      );
    }

    console.log("🔥 RETURNING RESPONSE WITH", timeSlots.length, "SLOTS");
    console.log("🔥 SAMPLE RESPONSE SLOT:", timeSlots[0]);

    return NextResponse.json({
      date: new Date(date),
      timeSlots,
      isWorkingDay: true,
    });
  } catch (error) {
    console.error("Error in day-details availability:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
