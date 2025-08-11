import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface DayAvailability {
  date: Date;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

export interface WorkingHours {
  day: string;
  startTime: string;
  endTime: string;
  isWorking: boolean;
}

export interface AvailabilitySettings {
  slotDuration: number;
  breakDuration: number;
  advanceBookingDays: number;
}

export function useAvailability() {
  const { user } = useAuth();
  const [availability, setAvailability] = useState<
    Record<string, DayAvailability>
  >({});
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([
    { day: "Monday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Tuesday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Wednesday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Thursday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Friday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Saturday", startTime: "10:00", endTime: "15:00", isWorking: false },
    { day: "Sunday", startTime: "10:00", endTime: "15:00", isWorking: false },
  ]);
  const [settings, setSettings] = useState<AvailabilitySettings>({
    slotDuration: 60,
    breakDuration: 60,
    advanceBookingDays: 30,
  });

  // Default time slots generator
  const generateDefaultTimeSlots = useCallback(
    (startTime: string, endTime: string, slotDuration: number): TimeSlot[] => {
      const slots: TimeSlot[] = [];
      let currentTime = new Date(`2000-01-01T${startTime}`);
      const endDateTime = new Date(`2000-01-01T${endTime}`);

      while (currentTime < endDateTime) {
        const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
        if (slotEnd <= endDateTime) {
          const slot = {
            id: `slot-${currentTime.getTime()}`,
            startTime: currentTime.toTimeString().slice(0, 5),
            endTime: slotEnd.toTimeString().slice(0, 5),
            isAvailable: true,
          };
          slots.push(slot);
        }
        currentTime = slotEnd;
      }

      return slots;
    },
    []
  );

  // Update availability for a specific date
  const updateDayAvailability = useCallback(
    (date: Date, updates: Partial<DayAvailability>) => {
      const dateKey = date.toISOString().split("T")[0];
      setAvailability((prev) => ({
        ...prev,
        [dateKey]: {
          ...prev[dateKey],
          ...updates,
          date,
        },
      }));
    },
    []
  );

  // Toggle time slot availability
  const toggleTimeSlot = useCallback(
    (date: Date, slotId: string) => {
      const dateKey = date.toISOString().split("T")[0];
      const currentDay = availability[dateKey];

      if (currentDay) {
        const updatedSlots = currentDay.timeSlots.map((slot) =>
          slot.id === slotId
            ? { ...slot, isAvailable: !slot.isAvailable }
            : slot
        );

        updateDayAvailability(date, { timeSlots: updatedSlots });
      }
    },
    [availability, updateDayAvailability]
  );

  // Toggle working day status
  const toggleWorkingDay = useCallback(
    (date: Date) => {
      const dateKey = date.toISOString().split("T")[0];
      const currentDay = availability[dateKey];

      if (currentDay) {
        const newIsWorking = !currentDay.isWorkingDay;
        let newTimeSlots = currentDay.timeSlots;

        // If making it a working day, generate default time slots
        if (newIsWorking && currentDay.timeSlots.length === 0) {
          const dayOfWeek = date.getDay();
          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayHours = workingHours[dayIndex];

          if (dayHours && dayHours.isWorking) {
            newTimeSlots = generateDefaultTimeSlots(
              dayHours.startTime,
              dayHours.endTime,
              settings.slotDuration
            );
          }
        }

        updateDayAvailability(date, {
          isWorkingDay: newIsWorking,
          timeSlots: newTimeSlots,
        });
      }
    },
    [
      availability,
      workingHours,
      settings.slotDuration,
      generateDefaultTimeSlots,
      updateDayAvailability,
    ]
  );

  // Update working hours
  const updateWorkingHours = useCallback(
    (index: number, field: keyof WorkingHours, value: string | boolean) => {
      setWorkingHours((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    []
  );

  // Update settings
  const updateSettings = useCallback(
    (updates: Partial<AvailabilitySettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    []
  );

  // Create default availability settings
  const createDefaultSettings = useCallback(async () => {
    if (!user) return;

    const defaultSettings = {
      user_id: user.id,
      slot_duration_minutes: 60,
      break_duration_minutes: 60,
      advance_booking_days: 30,
    };

    const { error } = await supabase
      .from("user_availability_settings")
      .insert(defaultSettings);

    if (!error) {
      setSettings({
        slotDuration: defaultSettings.slot_duration_minutes,
        breakDuration: defaultSettings.break_duration_minutes,
        advanceBookingDays: defaultSettings.advance_booking_days,
      });
    }
  }, [user]);

  // Create default working hours
  const createDefaultWorkingHours = useCallback(async () => {
    if (!user) return;

    const defaultHours = [
      {
        day_of_week: 1,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Monday
      {
        day_of_week: 2,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Tuesday
      {
        day_of_week: 3,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Wednesday
      {
        day_of_week: 4,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Thursday
      {
        day_of_week: 5,
        start_time: "09:00",
        end_time: "17:00",
        is_working: true,
      }, // Friday
      {
        day_of_week: 6,
        start_time: "10:00",
        end_time: "15:00",
        is_working: false,
      }, // Saturday
      {
        day_of_week: 0,
        start_time: "10:00",
        end_time: "15:00",
        is_working: false,
      }, // Sunday
    ];

    const { data: insertData, error: insertError } = await supabase
      .from("user_working_hours")
      .insert(defaultHours.map((h) => ({ ...h, user_id: user.id })))
      .select();

    if (!insertError) {
      const dayNames = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const formattedHours = dayNames.map((day, index) => {
        // Map array index to database day_of_week: Monday=1, Tuesday=2, ..., Sunday=0
        const dayOfWeek = index === 6 ? 0 : index + 1;
        const hourData = defaultHours.find((h) => h.day_of_week === dayOfWeek);
        return {
          day,
          startTime: hourData?.start_time || "09:00",
          endTime: hourData?.end_time || "17:00",
          isWorking: hourData?.is_working ?? index < 5,
        };
      });
      setWorkingHours(formattedHours);
    } else {
      console.error("Error inserting default working hours:", insertError);
      console.error(
        "Insert data:",
        defaultHours.map((h) => ({ ...h, user_id: user.id }))
      );
    }
  }, [user]);

  // Load availability from database
  const loadAvailability = useCallback(async () => {
    if (!user) {
      return { success: false, error: "No user" };
    }

    try {
      // Load settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("user_availability_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (settingsError) {
        console.error("Error loading settings:", settingsError);
      }

      if (settingsData) {
        setSettings({
          slotDuration: settingsData.slot_duration_minutes,
          breakDuration: settingsData.break_duration_minutes,
          advanceBookingDays: settingsData.advance_booking_days,
        });
      } else {
        await createDefaultSettings();
      }

      // Load working hours
      const { data: hoursData, error: hoursError } = await supabase
        .from("user_working_hours")
        .select("*")
        .eq("user_id", user.id)
        .order("day_of_week");

      if (hoursData && hoursData.length > 0) {
        const dayNames = [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ];
        const formattedHours = dayNames.map((day, index) => {
          // Map array index to day_of_week: Monday=1, Tuesday=2, ..., Sunday=0
          const dayOfWeek = index === 6 ? 0 : index + 1;
          const hourData = hoursData.find((h) => h.day_of_week === dayOfWeek);
          const formatted = {
            day,
            startTime: hourData?.start_time || "09:00",
            endTime: hourData?.end_time || "17:00",
            isWorking: hourData?.is_working ?? index < 5, // Mon-Fri working by default
          };
          return formatted;
        });
        setWorkingHours(formattedHours);
      } else {
        await createDefaultWorkingHours();
      }

      return { success: true };
    } catch (error) {
      console.error("Error loading availability:", error);
      return { success: false, error };
    }
  }, [user, createDefaultSettings, createDefaultWorkingHours]);

  // Save availability to database
  const saveAvailability = useCallback(async () => {
    if (!user) return { success: false, error: "No user" };

    try {
      // Save settings
      const { error: settingsError } = await supabase
        .from("user_availability_settings")
        .upsert({
          user_id: user.id,
          slot_duration_minutes: settings.slotDuration,
          break_duration_minutes: settings.breakDuration,
          advance_booking_days: settings.advanceBookingDays,
        });

      if (settingsError) {
        console.error("Error saving settings:", settingsError);
        throw settingsError;
      }

      // Save working hours
      const workingHoursData = workingHours.map((hour, index) => ({
        user_id: user.id,
        day_of_week: index === 6 ? 0 : index + 1, // Monday=1, Tuesday=2, ..., Sunday=0
        start_time: hour.startTime,
        end_time: hour.endTime,
        is_working: hour.isWorking,
      }));

      const { error: hoursError } = await supabase
        .from("user_working_hours")
        .upsert(workingHoursData, { onConflict: "user_id,day_of_week" });

      if (hoursError) throw hoursError;

      // Clear availability state to force regeneration with new settings
      setAvailability({});

      return { success: true };
    } catch (error) {
      console.error("Error saving availability:", error);
      return { success: false, error };
    }
  }, [user, settings, workingHours, setAvailability]);

  // Generate time slots for a specific date
  const generateTimeSlotsForDate = useCallback(
    async (date: Date) => {
      if (!user) {
        return;
      }

      const dateKey = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay();
      // Map JavaScript Date.getDay() (0=Sunday, 1=Monday) to workingHours array index (0=Monday, 6=Sunday)
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = workingHours[dayIndex];

      if (dayHours && dayHours.isWorking) {
        const timeSlots = generateDefaultTimeSlots(
          dayHours.startTime,
          dayHours.endTime,
          settings.slotDuration
        );

        // Update local state
        updateDayAvailability(date, {
          timeSlots,
          isWorkingDay: true,
        });

        // Save to database
        const slotsData = timeSlots.map((slot, index) => ({
          user_id: user.id,
          date: dateKey,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_available: slot.isAvailable,
          id: `${user.id}-${dateKey}-${index}`, // Generate a unique ID
        }));

        const { error: insertError } = await supabase
          .from("user_time_slots")
          .upsert(slotsData, {
            onConflict: "user_id,date,start_time,end_time",
          });

        if (insertError) {
          console.error("Error saving time slots to database:", insertError);
        } else {
          console.log("Time slots saved to database successfully");
        }
      } else {
        // Update local state to mark as non-working day
        updateDayAvailability(date, {
          timeSlots: [],
          isWorkingDay: false,
        });
      }
    },
    [
      user,
      workingHours,
      settings.slotDuration,
      generateDefaultTimeSlots,
      updateDayAvailability,
    ]
  );

  // Load time slots for a specific date
  const loadTimeSlotsForDate = useCallback(
    async (date: Date) => {
      if (!user) return;

      const dateKey = date.toISOString().split("T")[0];

      const { data: slotsData } = await supabase
        .from("user_time_slots")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", dateKey)
        .order("start_time");

      if (slotsData && slotsData.length > 0) {
        const timeSlots = slotsData.map((slot) => ({
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          isAvailable: slot.is_available,
        }));

        updateDayAvailability(date, {
          timeSlots,
          isWorkingDay: true,
        });
      } else {
        // Check if this should be a working day based on working hours
        const dayOfWeek = date.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayHours = workingHours[dayIndex];

        if (dayHours && dayHours.isWorking) {
          // Generate time slots for working day
          await generateTimeSlotsForDate(date);
        } else {
          // Mark as non-working day
          updateDayAvailability(date, {
            timeSlots: [],
            isWorkingDay: false,
          });
        }
      }
    },
    [user, workingHours, generateTimeSlotsForDate, updateDayAvailability]
  );

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadAvailability();
    }
  }, [user, loadAvailability]);

  return {
    availability,
    workingHours,
    settings,
    updateDayAvailability,
    toggleTimeSlot,
    toggleWorkingDay,
    updateWorkingHours,
    updateSettings,
    saveAvailability,
    loadAvailability,
    createDefaultSettings,
    createDefaultWorkingHours,
    generateDefaultTimeSlots,
    generateTimeSlotsForDate,
    loadTimeSlotsForDate,
    setAvailability,
    refreshCalendar: () => {
      // This will trigger a re-render and regenerate time slots
      setAvailability({});
    },
  };
}
