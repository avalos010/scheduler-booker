import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the current user
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log("🔍 Populating defaults for user:", userId);

    // Create default settings
    const defaultSettings = {
      user_id: userId,
      slot_duration_minutes: 60,
      break_duration_minutes: 15,
      advance_booking_days: 30,
    };

    const { data: settingsData, error: settingsError } = await supabase
      .from("user_availability_settings")
      .upsert(defaultSettings, { onConflict: "user_id" })
      .select()
      .single();

    if (settingsError) {
      console.error("Settings error:", settingsError);
      return NextResponse.json(
        { error: "Failed to create settings" },
        { status: 500 }
      );
    }

    // Create default working hours
    const defaultWorkingHours = [
      {
        user_id: userId,
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Monday
      {
        user_id: userId,
        day_of_week: 2,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Tuesday
      {
        user_id: userId,
        day_of_week: 3,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Wednesday
      {
        user_id: userId,
        day_of_week: 4,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Thursday
      {
        user_id: userId,
        day_of_week: 5,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Friday
      {
        user_id: userId,
        day_of_week: 6,
        start_time: "10:00",
        end_time: "15:00",
        is_working: false,
      }, // Saturday
      {
        user_id: userId,
        day_of_week: 0,
        start_time: "10:00",
        end_time: "15:00",
        is_working: false,
      }, // Sunday
    ];

    const { error: hoursError } = await supabase
      .from("user_working_hours")
      .upsert(defaultWorkingHours, { onConflict: "user_id,day_of_week" });

    if (hoursError) {
      console.error("Working hours error:", hoursError);
      return NextResponse.json(
        { error: "Failed to create working hours" },
        { status: 500 }
      );
    }

    // Generate time slots for the current month
    const currentDate = new Date();
    const monthStart = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1
    );
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    const timeSlots = [];
    const exceptions = [];

    for (
      let d = new Date(monthStart);
      d <= monthEnd;
      d.setDate(d.getDate() + 1)
    ) {
      const dateKey = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = defaultWorkingHours[dayIndex];

      if (dayHours.is_working) {
        // Generate time slots for working days
        let currentTime = new Date(`2000-01-01T${dayHours.start_time}`);
        const endTime = new Date(`2000-01-01T${dayHours.end_time}`);

        while (currentTime < endTime) {
          const slotStart = currentTime.toTimeString().slice(0, 5);
          const slotEnd = new Date(currentTime.getTime() + 60 * 60000); // 60 minute slots

          if (slotEnd <= endTime) {
            timeSlots.push({
              user_id: userId,
              date: dateKey,
              start_time: slotStart,
              end_time: slotEnd.toTimeString().slice(0, 5),
              is_available: true,
              is_booked: false,
            });
          }

          // Move to next slot (including 15 minute break)
          currentTime = new Date(slotEnd.getTime() + 15 * 60000);
        }

        // Mark as working day
        exceptions.push({
          user_id: userId,
          date: dateKey,
          is_available: true,
          reason: "Default working day",
        });
      } else {
        // Mark as non-working day
        exceptions.push({
          user_id: userId,
          date: dateKey,
          is_available: false,
          reason: "Default non-working day",
        });
      }
    }

    // Insert time slots
    if (timeSlots.length > 0) {
      const { error: slotsError } = await supabase
        .from("user_time_slots")
        .upsert(timeSlots, { onConflict: "user_id,date,start_time,end_time" });

      if (slotsError) {
        console.error("Time slots error:", slotsError);
        return NextResponse.json(
          { error: "Failed to create time slots" },
          { status: 500 }
        );
      }
    }

    // Insert exceptions
    if (exceptions.length > 0) {
      const { error: exceptionsError } = await supabase
        .from("user_availability_exceptions")
        .upsert(exceptions, { onConflict: "user_id,date" });

      if (exceptionsError) {
        console.error("Exceptions error:", exceptionsError);
        return NextResponse.json(
          { error: "Failed to create exceptions" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Database populated with default data",
      data: {
        settings: settingsData,
        workingHours: defaultWorkingHours.length,
        timeSlots: timeSlots.length,
        exceptions: exceptions.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Populate defaults error:", error);
    return NextResponse.json(
      { error: "Failed to populate defaults", details: error },
      { status: 500 }
    );
  }
}
