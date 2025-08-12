import { useState, useCallback, useEffect, useMemo } from "react";
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

  // Comprehensive loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState({
    workingHours: false,
    settings: false,
    exceptions: false,
    timeSlots: false,
  });

  // Check if all data is loaded
  const isFullyLoaded = useMemo(() => {
    return (
      workingHours.length > 0 &&
      settings.slotDuration > 0 &&
      loadingSteps.workingHours &&
      loadingSteps.settings &&
      loadingSteps.exceptions &&
      loadingSteps.timeSlots
    );
  }, [workingHours, settings, loadingSteps]);

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
            id: crypto.randomUUID(), // Generate proper UUID
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
    async (date: Date, slotId: string) => {
      const dateKey = date.toISOString().split("T")[0];
      const currentDay = availability[dateKey];

      if (currentDay) {
        const updatedSlots = currentDay.timeSlots.map((slot) =>
          slot.id === slotId
            ? { ...slot, isAvailable: !slot.isAvailable }
            : slot
        );

        // Update local state
        updateDayAvailability(date, { timeSlots: updatedSlots });

        // Save to database
        if (user) {
          const slotToUpdate = updatedSlots.find((slot) => slot.id === slotId);
          if (slotToUpdate) {
            const { error } = await supabase.from("user_time_slots").upsert(
              {
                user_id: user.id,
                date: dateKey,
                start_time: slotToUpdate.startTime,
                end_time: slotToUpdate.endTime,
                is_available: slotToUpdate.isAvailable,
              },
              { onConflict: "user_id,date,start_time,end_time" }
            );

            if (error) {
              console.error("Error updating time slot:", error);
            }
          }
        }
      }
    },
    [availability, updateDayAvailability, user]
  );

  // Toggle working day status
  const toggleWorkingDay = useCallback(
    async (date: Date) => {
      console.log("toggleWorkingDay called with date:", date);
      console.log("Current availability:", availability);
      console.log("Current workingHours:", workingHours);
      console.log("Current settings:", settings);

      const dateKey = date.toISOString().split("T")[0];
      const currentDay = availability[dateKey];

      console.log("Date key:", dateKey);
      console.log("Current day data:", currentDay);

      if (currentDay) {
        const newIsWorking = !currentDay.isWorkingDay;
        let newTimeSlots = currentDay.timeSlots;

        console.log(
          "Toggling from",
          currentDay.isWorkingDay,
          "to",
          newIsWorking
        );

        // If making it a working day, generate default time slots
        if (newIsWorking && currentDay.timeSlots.length === 0) {
          const dayOfWeek = date.getDay();
          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayHours = workingHours[dayIndex];

          console.log("Day of week:", dayOfWeek, "Day index:", dayIndex);
          console.log("Day hours:", dayHours);

          if (dayHours && dayHours.isWorking) {
            newTimeSlots = generateDefaultTimeSlots(
              dayHours.startTime,
              dayHours.endTime,
              settings.slotDuration
            );
            console.log("Generated new time slots:", newTimeSlots);
          }
        }

        // Update local state
        updateDayAvailability(date, {
          isWorkingDay: newIsWorking,
          timeSlots: newTimeSlots,
        });

        // Save to database
        await saveDayAvailabilityException(date, newIsWorking, newTimeSlots);

        console.log("Updated day availability");
      } else {
        console.log("No current day data found, creating new day");
        // Create a new day entry if it doesn't exist
        const dayOfWeek = date.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayHours = workingHours[dayIndex];

        const newIsWorking = !(dayHours?.isWorking ?? false);
        let newTimeSlots: TimeSlot[] = [];

        if (newIsWorking && dayHours?.isWorking) {
          newTimeSlots = generateDefaultTimeSlots(
            dayHours.startTime,
            dayHours.endTime,
            settings.slotDuration
          );
        }

        // Update local state
        updateDayAvailability(date, {
          isWorkingDay: newIsWorking,
          timeSlots: newTimeSlots,
        });

        // Save to database
        await saveDayAvailabilityException(date, newIsWorking, newTimeSlots);

        console.log("Created new day availability");
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
      .upsert(defaultSettings, { onConflict: "user_id" });

    if (!error) {
      setSettings({
        slotDuration: defaultSettings.slot_duration_minutes,
        breakDuration: defaultSettings.break_duration_minutes,
        advanceBookingDays: defaultSettings.advance_booking_days,
      });
    } else {
      console.error("Error creating default settings:", error);
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
        .eq("user_id", user.id);

      if (settingsError) {
        console.error("Error loading settings:", settingsError);
      }

      if (settingsData && settingsData.length > 0) {
        // If multiple settings exist, use the most recent one and clean up duplicates
        let settingsToUse = settingsData[0];

        if (settingsData.length > 1) {
          console.warn(
            `Found ${settingsData.length} settings records for user ${user.id}, cleaning up duplicates`
          );

          // Use the most recent record (assuming there's a created_at or updated_at field)
          // For now, just use the first one and delete the rest
          settingsToUse = settingsData[0];

          // Delete duplicate records (keep only the first one)
          const duplicateIds = settingsData.slice(1).map((record) => record.id);
          if (duplicateIds.length > 0) {
            const { error: deleteError } = await supabase
              .from("user_availability_settings")
              .delete()
              .in("id", duplicateIds);

            if (deleteError) {
              console.error("Error deleting duplicate settings:", deleteError);
            } else {
              console.log(
                `Deleted ${duplicateIds.length} duplicate settings records`
              );
            }
          }
        }

        setSettings({
          slotDuration: settingsToUse.slot_duration_minutes,
          breakDuration: settingsToUse.break_duration_minutes,
          advanceBookingDays: settingsToUse.advance_booking_days,
        });
        setLoadingSteps((prev) => ({ ...prev, settings: true }));
      } else {
        await createDefaultSettings();
        setLoadingSteps((prev) => ({ ...prev, settings: true }));
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
            isWorking:
              hourData?.is_working !== undefined
                ? hourData.is_working
                : index < 5, // Mon-Fri working by default, but respect database values
          };
          return formatted;
        });
        setWorkingHours(formattedHours);
        setLoadingSteps((prev) => ({ ...prev, workingHours: true }));
      } else {
        await createDefaultWorkingHours();
        setLoadingSteps((prev) => ({ ...prev, workingHours: true }));
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
        const slotsData = timeSlots.map((slot) => ({
          user_id: user.id,
          date: dateKey,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_available: slot.isAvailable,
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

      // Mark time slots as loaded for this date
      setLoadingSteps((prev) => ({ ...prev, timeSlots: true }));
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

      // First check if there's an availability exception for this date
      const { data: exceptionData } = await supabase
        .from("user_availability_exceptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", dateKey)
        .single();

      if (exceptionData) {
        // Use the exception data
        if (exceptionData.is_available) {
          // Load time slots for working day
          const { data: slotsData } = await supabase
            .from("user_time_slots")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", dateKey)
            .order("start_time");

          if (slotsData && slotsData.length > 0) {
            const timeSlots = slotsData.map((slot) => ({
              id: slot.id, // Use the database UUID
              startTime: slot.start_time,
              endTime: slot.end_time,
              isAvailable: slot.is_available,
            }));

            updateDayAvailability(date, {
              timeSlots,
              isWorkingDay: true,
            });
          } else {
            // Generate time slots for working day
            await generateTimeSlotsForDate(date);
          }
        } else {
          // Mark as non-working day based on exception
          updateDayAvailability(date, {
            timeSlots: [],
            isWorkingDay: false,
          });
        }
      } else {
        // No exception, check if this should be a working day based on working hours
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

  // Save day availability exception to database
  const saveDayAvailabilityException = useCallback(
    async (date: Date, isWorkingDay: boolean, timeSlots: TimeSlot[]) => {
      if (!user) return { success: false, error: "No user" };

      try {
        const dateKey = date.toISOString().split("T")[0];

        // Save availability exception
        const { error: exceptionError } = await supabase
          .from("user_availability_exceptions")
          .upsert(
            {
              user_id: user.id,
              date: dateKey,
              is_available: isWorkingDay,
              reason: isWorkingDay
                ? "Working day override"
                : "Non-working day override",
            },
            { onConflict: "user_id,date" }
          );

        if (exceptionError) {
          console.error("Error saving availability exception:", exceptionError);
          throw exceptionError;
        }

        // If it's a working day, save time slots
        if (isWorkingDay && timeSlots.length > 0) {
          const slotsData = timeSlots.map((slot) => ({
            user_id: user.id,
            date: dateKey,
            start_time: slot.startTime,
            end_time: slot.endTime,
            is_available: slot.isAvailable,
          }));

          const { error: slotsError } = await supabase
            .from("user_time_slots")
            .upsert(slotsData, {
              onConflict: "user_id,date,start_time,end_time",
            });

          if (slotsError) {
            console.error("Error saving time slots:", slotsError);
            throw slotsError;
          }
        } else if (!isWorkingDay) {
          // If it's not a working day, remove any existing time slots
          const { error: deleteError } = await supabase
            .from("user_time_slots")
            .delete()
            .eq("user_id", user.id)
            .eq("date", dateKey);

          if (deleteError) {
            console.error("Error deleting time slots:", deleteError);
            // Don't throw here as this is not critical
          }
        }

        return { success: true };
      } catch (error) {
        console.error("Error saving day availability exception:", error);
        return { success: false, error };
      }
    },
    [user]
  );

  // Load day availability exceptions from database
  const loadDayAvailabilityExceptions = useCallback(async () => {
    if (!user) return { success: false, error: "No user" };

    try {
      const { data: exceptionsData, error: exceptionsError } = await supabase
        .from("user_availability_exceptions")
        .select("*")
        .eq("user_id", user.id);

      if (exceptionsError) {
        console.error(
          "Error loading availability exceptions:",
          exceptionsError
        );
        throw exceptionsError;
      }

      // Update local state with exceptions
      if (exceptionsData) {
        const exceptionsMap: Record<
          string,
          { isWorkingDay: boolean; reason?: string }
        > = {};

        exceptionsData.forEach((exception) => {
          exceptionsMap[exception.date] = {
            isWorkingDay: exception.is_available,
            reason: exception.reason,
          };
        });

        // Update availability state with exceptions
        setAvailability((prev) => {
          const updated = { ...prev };

          Object.entries(exceptionsMap).forEach(([dateKey, exception]) => {
            if (updated[dateKey]) {
              updated[dateKey] = {
                ...updated[dateKey],
                isWorkingDay: exception.isWorkingDay,
              };
            } else {
              // Create new entry if it doesn't exist
              const date = new Date(dateKey);
              updated[dateKey] = {
                date,
                timeSlots: [],
                isWorkingDay: exception.isWorkingDay,
              };
            }
          });

          return updated;
        });
      }

      setLoadingSteps((prev) => ({ ...prev, exceptions: true }));
      return { success: true };
    } catch (error) {
      console.error("Error loading day availability exceptions:", error);
      return { success: false, error };
    }
  }, [user]);

  // Load data on mount
  useEffect(() => {
    if (user) {
      loadAvailability().then(() => {
        // After loading basic availability, load day-specific exceptions
        loadDayAvailabilityExceptions();
      });
    }
  }, [user, loadAvailability, loadDayAvailabilityExceptions]);

  // Update overall loading state when all steps are complete
  useEffect(() => {
    if (isFullyLoaded) {
      setIsLoading(false);
    }
  }, [isFullyLoaded]);

  return {
    availability,
    workingHours,
    settings,
    isLoading,
    isFullyLoaded,
    loadingSteps,
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
    saveDayAvailabilityException,
    loadDayAvailabilityExceptions,
    setAvailability,
    markTimeSlotsLoaded: () => {
      console.log("markTimeSlotsLoaded called, setting timeSlots to true");
      setLoadingSteps((prev) => ({ ...prev, timeSlots: true }));
    },
    refreshCalendar: () => {
      // This will trigger a re-render and regenerate time slots
      setAvailability({});
    },
  };
}
