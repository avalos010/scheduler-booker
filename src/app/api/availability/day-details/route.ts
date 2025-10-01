import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { addMonths, startOfMonth } from "date-fns";
import {
  formatTime,
  extractTimeFromTimestamp,
} from "@/lib/utils/serverTimeFormat";

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

    // Validate that the requested date is within a reasonable booking range
    // (past 30 days to future 90 days)
    const requestedDate = new Date(date);
    const today = new Date();
    const pastLimit = new Date(today);
    pastLimit.setDate(today.getDate() - 30);
    const futureLimit = new Date(today);
    futureLimit.setDate(today.getDate() + 90);

    if (requestedDate < pastLimit || requestedDate > futureLimit) {
      return NextResponse.json(
        {
          message:
            "Date is outside the allowed booking range. You can only view availability for the past 30 days to 90 days in the future.",
        },
        { status: 400 }
      );
    }

    // Get working hours for the day
    const jsDayOfWeek = new Date(date).getDay();
    const dayOfWeek = jsDayOfWeek === 0 ? 7 : jsDayOfWeek;

    console.log("🔥 Working hours query:", {
      userId,
      date,
      jsDayOfWeek,
      dayOfWeek,
    });

    const { data: workingHours, error: workingHoursError } = await supabase
      .from("user_working_hours")
      .select("*")
      .eq("user_id", userId)
      .eq("day_of_week", dayOfWeek)
      .single();

    console.log("🔥 Working hours result:", {
      workingHours,
      workingHoursError,
      isWorking: workingHours?.is_working,
    });

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

    // Always generate the full set of time slots from working hours first
    let timeSlots: ApiTimeSlot[] = [];

    if (workingHoursError || !workingHours || !workingHours.is_working) {
      console.log("🔥 NOT A WORKING DAY:", {
        workingHoursError,
        workingHours,
        isWorking: workingHours?.is_working,
      });
      return NextResponse.json({
        date: new Date(date),
        timeSlots: [],
        isWorkingDay: false,
      });
    }

    // Generate time slots from working hours
    const { data: settings } = await supabase
      .from("user_availability_settings")
      .select("slot_duration_minutes")
      .eq("user_id", userId)
      .single();

    const slotDuration = settings?.slot_duration_minutes || 60;

    // Extract time portion from working hours (they might be stored as timestamps)
    const startTime = extractTimeFromTimestamp(workingHours.start_time);
    const endTime = extractTimeFromTimestamp(workingHours.end_time);

    console.log("🔥 Working hours extracted:", {
      originalStart: workingHours.start_time,
      extractedStart: startTime,
      originalEnd: workingHours.end_time,
      extractedEnd: endTime,
    });

    // Generate time slots
    const slots: ApiTimeSlot[] = [];
    let currentTime = new Date(`2000-01-01T${startTime}`);
    const endTimeDate = new Date(`2000-01-01T${endTime}`);

    console.log("🔥 Time slot generation:", {
      startTime,
      endTime,
      slotDuration,
      currentTime: currentTime.toISOString(),
      endTimeDate: endTimeDate.toISOString(),
    });

    while (currentTime < endTimeDate) {
      const slotStart = currentTime.toTimeString().slice(0, 5);
      const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000)
        .toTimeString()
        .slice(0, 5);

      if (new Date(`2000-01-01T${slotEnd}`) <= endTimeDate) {
        slots.push({
          id: `${userId}-${date}-${slotStart}-${slotEnd}`,
          startTime: slotStart,
          endTime: slotEnd,
          isAvailable: true, // Default to available
          isBooked: false,
        });
        console.log("🔥 Generated slot:", { slotStart, slotEnd });
      }

      currentTime = new Date(currentTime.getTime() + slotDuration * 60000);
    }

    console.log("🔥 Total slots generated:", slots.length);

    timeSlots = slots;

    console.log(
      "🔥 Generated time slots:",
      timeSlots.map((slot) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        id: slot.id,
      }))
    );

    // Now apply any custom overrides from the database
    if (customTimeSlots && customTimeSlots.length > 0) {
      console.log("🔥 APPLYING CUSTOM TIME SLOT OVERRIDES");
      customTimeSlots.forEach((customSlot) => {
        const startTime = extractTimeFromTimestamp(customSlot.start_time);
        const endTime = extractTimeFromTimestamp(customSlot.end_time);

        console.log("🔥 Processing custom slot:", {
          originalStart: customSlot.start_time,
          extractedStart: startTime,
          originalEnd: customSlot.end_time,
          extractedEnd: endTime,
          isAvailable: customSlot.is_available,
        });

        // Find the corresponding slot in our generated slots
        const existingSlotIndex = timeSlots.findIndex(
          (slot) => slot.startTime === startTime && slot.endTime === endTime
        );

        if (existingSlotIndex !== -1) {
          // Update the existing slot with custom data
          console.log(
            "🔥 Updating existing slot at index",
            existingSlotIndex,
            "from",
            timeSlots[existingSlotIndex].isAvailable,
            "to",
            customSlot.is_available
          );
          timeSlots[existingSlotIndex].isAvailable = customSlot.is_available;
        } else {
          // Add a new custom slot if it doesn't exist in the generated set
          console.log("🔥 Adding new custom slot:", {
            startTime,
            endTime,
            isAvailable: customSlot.is_available,
          });
          timeSlots.push({
            id: `${userId}-${date}-${startTime}-${endTime}`,
            startTime,
            endTime,
            isAvailable: customSlot.is_available,
            isBooked: false,
          });
        }
      });
    }

    // Check for existing bookings to enrich the time slots
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("start_time, end_time, status, client_name, client_email, notes")
      .eq("user_id", userId)
      .eq("date", date);

    if (existingBookings) {
      timeSlots.forEach((slot) => {
        const booking = existingBookings.find((b) => {
          // Extract time portion from booking timestamps for comparison
          const bookingStartTime = extractTimeFromTimestamp(b.start_time);
          const bookingEndTime = extractTimeFromTimestamp(b.end_time);
          return (
            bookingStartTime === slot.startTime &&
            bookingEndTime === slot.endTime
          );
        });

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

    // Apply time formatting
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

    console.log("🔥 RETURNING UNIFIED RESPONSE WITH FORMATTING!");
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
