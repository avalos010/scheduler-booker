import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
    const { data: customTimeSlots, error: timeSlotsError } = await supabase
      .from("user_time_slots")
      .select("*")
      .eq("user_id", userId)
      .eq("date", date)
      .order("start_time");

    // This logic is similar to the public one, but crucially, it WILL return booking details.
    if (customTimeSlots && customTimeSlots.length > 0) {
      const timeSlots = customTimeSlots.map((slot) => ({
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
            (slot as any).bookingDetails = {
              clientName: booking.client_name,
              clientEmail: booking.client_email,
              notes: booking.notes,
              status: booking.status,
            };
          }
        });
      }

      return NextResponse.json({
        date: new Date(date),
        timeSlots,
        isWorkingDay: true,
      });
    }

    // Default path if no custom slots (similar logic)
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

    const timeSlots: any[] = [];
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
