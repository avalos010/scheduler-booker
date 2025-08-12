import { useState, useCallback, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import {
  saveToCache,
  loadFromCache,
  clearCache,
  updateCacheAvailability,
  updateCacheWorkingHours,
  updateCacheSettings,
} from "@/lib/cache-utils";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked?: boolean; // Optional for backward compatibility
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

      // Ensure time strings have proper format (add seconds if missing)
      const startTimeFormatted = startTime.includes(":")
        ? startTime
        : `${startTime}:00`;
      const endTimeFormatted = endTime.includes(":")
        ? endTime
        : `${endTime}:00`;

      let currentTime = new Date(`2000-01-01T${startTimeFormatted}`);
      const endDateTime = new Date(`2000-01-01T${endTimeFormatted}`);

      while (currentTime < endDateTime) {
        const slotEnd = new Date(currentTime.getTime() + slotDuration * 60000);
        if (slotEnd <= endDateTime) {
          const slot = {
            id: crypto.randomUUID
              ? crypto.randomUUID()
              : `slot_${Date.now()}_${Math.random()}`, // Generate proper UUID or fallback
            startTime: currentTime.toTimeString().slice(0, 5),
            endTime: slotEnd.toTimeString().slice(0, 5),
            isAvailable: true,
            isBooked: false, // New slots are not booked by default
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
      setAvailability((prev) => {
        const updated = {
          ...prev,
          [dateKey]: {
            ...prev[dateKey],
            ...updates,
            date,
          },
        };
        // Update cache when availability changes
        if (user) {
          updateCacheAvailability(user.id, updated);
        }
        return updated;
      });
    },
    [user]
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

        // Update cache with modified time slots
        setAvailability((prev) => {
          if (user) {
            updateCacheAvailability(user.id, prev);
          }
          return prev;
        });

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

      // Check if working hours are loaded
      if (workingHours.length === 0) {
        console.log("Working hours not loaded yet, cannot toggle day");
        return;
      }

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

          if (dayHours && dayHours.isWorking) {
            newTimeSlots = generateDefaultTimeSlots(
              dayHours.startTime,
              dayHours.endTime,
              settings.slotDuration
            );
          }
        }

        // Update local state
        updateDayAvailability(date, {
          isWorkingDay: newIsWorking,
          timeSlots: newTimeSlots,
        });

        // Save to database
        await saveDayAvailabilityException(date, newIsWorking, newTimeSlots);
      } else {
        // Create a new day entry if it doesn't exist
        const dayOfWeek = date.getDay();
        const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const dayHours = workingHours[dayIndex];

        // Default to the opposite of what the working hours say
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
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Don't update if working hours array is empty (still loading)
      if (workingHours.length === 0) return;

      setWorkingHours((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };

        // Update cache with new working hours
        if (user) {
          updateCacheWorkingHours(user.id, updated);
        }

        return updated;
      });
    },
    [workingHours.length, user]
  );

  // Update settings
  const updateSettings = useCallback(
    (updates: Partial<AvailabilitySettings>) => {
      // Don't update if settings are not loaded yet
      if (settings.slotDuration === 0) return;

      setSettings((prev) => {
        const updated = { ...prev, ...updates };

        // Update cache with new settings
        if (user) {
          updateCacheSettings(user.id, updated);
        }

        return updated;
      });
    },
    [settings.slotDuration, user]
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

    const { error: insertError } = await supabase
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
        const formatted = {
          day,
          startTime: hourData?.start_time || "09:00",
          endTime: hourData?.end_time || "17:00",
          isWorking: hourData?.is_working ?? index < 5,
        };
        return formatted;
      });

      setWorkingHours(formattedHours);
    } else {
      console.error("Error inserting default working hours:", insertError);
    }
  }, [user]);

  // Load availability from database
  const loadAvailability = useCallback(
    async (forceRefresh = false) => {
      if (!user) {
        return { success: false, error: "No user" };
      }

      // Try to load from cache first (unless force refresh is requested)
      if (!forceRefresh) {
        const cachedData = loadFromCache(user.id);
        if (cachedData) {
          console.log("Loading from cache...");
          setAvailability(cachedData.availability);
          setWorkingHours(cachedData.workingHours);
          setSettings(cachedData.settings);
          setLoadingSteps({
            workingHours: true,
            settings: true,
            exceptions: true,
            timeSlots: true,
          });
          return { success: true, fromCache: true };
        }
      }

      console.log("Loading from database...");
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
            // Use the most recent record (assuming there's a created_at or updated_at field)
            // For now, just use the first one and delete the rest
            settingsToUse = settingsData[0];

            // Delete duplicate records (keep only the first one)
            const duplicateIds = settingsData
              .slice(1)
              .map((record) => record.id);
            if (duplicateIds.length > 0) {
              const { error: deleteError } = await supabase
                .from("user_availability_settings")
                .delete()
                .in("id", duplicateIds);

              if (deleteError) {
                console.error(
                  "Error deleting duplicate settings:",
                  deleteError
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
          console.log("No settings found, creating defaults");
          await createDefaultSettings();
          setLoadingSteps((prev) => ({ ...prev, settings: true }));
        }

        // Load working hours
        const { data: hoursData, error: hoursError } = await supabase
          .from("user_working_hours")
          .select("*")
          .eq("user_id", user.id)
          .order("day_of_week");

        if (hoursError) {
          console.error("Error loading working hours:", hoursError);
        }

        if (hoursData && hoursData.length > 0) {
          console.log("Raw working hours data from database:", hoursData);

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

            console.log(
              `Day ${day} (index ${index}, day_of_week ${dayOfWeek}):`,
              hourData
            );

            const formatted = {
              day,
              startTime: hourData?.start_time || "09:00",
              endTime: hourData?.end_time || "17:00",
              isWorking:
                hourData?.is_working !== undefined
                  ? hourData.is_working
                  : index < 5, // Mon-Fri working by default, but respect database values
            };

            console.log(`Formatted ${day}:`, formatted);
            return formatted;
          });

          console.log("Final formatted working hours:", formattedHours);
          setWorkingHours(formattedHours);
          setLoadingSteps((prev) => ({ ...prev, workingHours: true }));
          console.log("Working hours state updated, loading steps:", {
            workingHours: true,
          });
        } else {
          console.log("No working hours found, creating defaults");
          await createDefaultWorkingHours();
          setLoadingSteps((prev) => ({ ...prev, workingHours: true }));
          console.log("Default working hours created, loading steps:", {
            workingHours: true,
          });
        }

        // Save to cache after successful load
        saveToCache(user.id, {
          availability: {},
          workingHours: workingHours.length > 0 ? workingHours : [],
          settings:
            settings.slotDuration > 0
              ? settings
              : {
                  slotDuration: 60,
                  breakDuration: 60,
                  advanceBookingDays: 30,
                },
          exceptions: {},
        });

        return { success: true };
      } catch (error) {
        console.error("Error loading availability:", error);
        return { success: false, error };
      }
    },
    [
      user,
      createDefaultSettings,
      createDefaultWorkingHours,
      settings,
      workingHours,
    ]
  );

  // Save availability to database
  const saveAvailability = useCallback(async () => {
    if (!user) {
      console.error("saveAvailability called but no user available");
      return { success: false, error: "No user" };
    }

    try {
      // Save settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("user_availability_settings")
        .upsert({
          user_id: user.id,
          slot_duration_minutes: settings.slotDuration,
          break_duration_minutes: settings.breakDuration,
          advance_booking_days: settings.advanceBookingDays,
        })
        .select();

      if (settingsError) {
        console.error("Error saving settings:", settingsError);
        throw settingsError;
      }

      console.log("Settings saved successfully:", settingsData);

      // Save working hours
      const workingHoursData = workingHours.map((hour, index) => ({
        user_id: user.id,
        day_of_week: index === 6 ? 0 : index + 1, // Monday=1, Tuesday=2, ..., Sunday=0
        start_time: hour.startTime,
        end_time: hour.endTime,
        is_working: hour.isWorking,
      }));

      console.log("Saving working hours data:", workingHoursData);

      const { error: hoursError } = await supabase
        .from("user_working_hours")
        .upsert(workingHoursData, { onConflict: "user_id,day_of_week" });

      if (hoursError) {
        console.error("Error saving working hours:", hoursError);
        throw hoursError;
      } else {
        console.log("Working hours saved successfully");
      }

      // Clear availability state to force regeneration with new settings
      setAvailability({});

      // Update cache with new working hours and settings
      saveToCache(user.id, {
        availability: {},
        workingHours,
        settings,
        exceptions: {},
      });

      return { success: true };
    } catch (error) {
      console.error("Error saving availability:", error);
      return { success: false, error };
    }
  }, [user, settings, workingHours, setAvailability]);

  // Generate time slots for a specific date
  const generateTimeSlotsForDate = useCallback(
    async (date: Date) => {
      if (!user) return;

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

        // Update local state immediately
        setAvailability((prev) => {
          const updated = {
            ...prev,
            [dateKey]: {
              date,
              timeSlots,
              isWorkingDay: true,
            },
          };
          // Update cache with new availability
          updateCacheAvailability(user.id, updated);
          return updated;
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
        }
      } else {
        // Update local state to mark as non-working day
        setAvailability((prev) => {
          const updated = {
            ...prev,
            [dateKey]: {
              date,
              timeSlots: [],
              isWorkingDay: false,
            },
          };
          // Update cache with new availability
          updateCacheAvailability(user.id, updated);
          return updated;
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
      setAvailability,
    ]
  );

  // Optimized: Load all time slots for a month in batch
  const loadTimeSlotsForMonth = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!user) return;

      const startDateKey = startDate.toISOString().split("T")[0];
      const endDateKey = endDate.toISOString().split("T")[0];

      // Batch load all exceptions for the month
      const { data: exceptionsData } = await supabase
        .from("user_availability_exceptions")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDateKey)
        .lte("date", endDateKey);

      // Batch load all time slots for the month
      const { data: slotsData } = await supabase
        .from("user_time_slots")
        .select("*")
        .eq("user_id", user.id)
        .gte("date", startDateKey)
        .lte("date", endDateKey)
        .order("date, start_time");

      // Create lookup maps for fast access
      const exceptionsMap = new Map();
      if (exceptionsData) {
        exceptionsData.forEach((exception) => {
          exceptionsMap.set(exception.date, exception);
        });
      }

      const slotsMap = new Map();
      if (slotsData) {
        slotsData.forEach((slot) => {
          const dateKey = slot.date;
          if (!slotsMap.has(dateKey)) {
            slotsMap.set(dateKey, []);
          }
          slotsMap.get(dateKey).push({
            id: slot.id,
            startTime: slot.start_time,
            endTime: slot.end_time,
            isAvailable: slot.is_available,
            isBooked: slot.is_booked,
          });
        });
      }

      return { exceptionsMap, slotsMap };
    },
    [user]
  );

  // Load time slots for a specific date (kept for backward compatibility)
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
              isBooked: slot.is_booked,
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
          // Check if time slots already exist in database
          const { data: existingSlotsData } = await supabase
            .from("user_time_slots")
            .select("*")
            .eq("user_id", user.id)
            .eq("date", dateKey)
            .order("start_time");

          if (existingSlotsData && existingSlotsData.length > 0) {
            // Use existing time slots (preserves booking status)
            const timeSlots = existingSlotsData.map((slot) => ({
              id: slot.id,
              startTime: slot.start_time,
              endTime: slot.end_time,
              isAvailable: slot.is_available,
              isBooked: slot.is_booked,
            }));

            updateDayAvailability(date, {
              timeSlots,
              isWorkingDay: true,
            });
          } else {
            // Generate new time slots for working day
            await generateTimeSlotsForDate(date);
          }
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

  // Optimized: Process multiple days using batched data
  const processMonthDays = useCallback(
    async (
      days: Date[],
      exceptionsMap: Map<string, { is_available: boolean; reason?: string }>,
      slotsMap: Map<string, TimeSlot[]>
    ) => {
      const newAvailability: Record<string, DayAvailability> = {};

      for (const day of days) {
        const dateKey = day.toISOString().split("T")[0];
        const exception = exceptionsMap.get(dateKey);
        const existingSlots = slotsMap.get(dateKey) || [];

        if (exception) {
          // Use exception data
          if (exception.is_available) {
            if (existingSlots.length > 0) {
              newAvailability[dateKey] = {
                date: day,
                timeSlots: existingSlots,
                isWorkingDay: true,
              };
            } else {
              // Generate slots for working day exception
              const dayOfWeek = day.getDay();
              const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const dayHours = workingHours[dayIndex];

              if (dayHours && dayHours.isWorking) {
                const generatedSlots = generateDefaultTimeSlots(
                  dayHours.startTime,
                  dayHours.endTime,
                  settings.slotDuration
                );
                newAvailability[dateKey] = {
                  date: day,
                  timeSlots: generatedSlots,
                  isWorkingDay: true,
                };
              } else {
                newAvailability[dateKey] = {
                  date: day,
                  timeSlots: [],
                  isWorkingDay: true, // Exception overrides default
                };
              }
            }
          } else {
            // Non-working day exception
            newAvailability[dateKey] = {
              date: day,
              timeSlots: [],
              isWorkingDay: false,
            };
          }
        } else {
          // No exception, use working hours
          const dayOfWeek = day.getDay();
          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayHours = workingHours[dayIndex];

          if (dayHours && dayHours.isWorking) {
            if (existingSlots.length > 0) {
              // Use existing slots (preserves bookings)
              newAvailability[dateKey] = {
                date: day,
                timeSlots: existingSlots,
                isWorkingDay: true,
              };
            } else {
              // Generate new slots
              const generatedSlots = generateDefaultTimeSlots(
                dayHours.startTime,
                dayHours.endTime,
                settings.slotDuration
              );
              newAvailability[dateKey] = {
                date: day,
                timeSlots: generatedSlots,
                isWorkingDay: true,
              };
            }
          } else {
            // Non-working day
            newAvailability[dateKey] = {
              date: day,
              timeSlots: existingSlots, // Preserve any existing bookings
              isWorkingDay: false,
            };
          }
        }
      }

      // Update state with all processed days at once
      setAvailability((prev) => {
        const updated = { ...prev, ...newAvailability };
        if (user) {
          updateCacheAvailability(user.id, updated);
        }
        return updated;
      });
    },
    [user, workingHours, settings.slotDuration, generateDefaultTimeSlots]
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

  // Reset calendar to default working hours (clear all exceptions)
  const resetCalendarToDefaults = useCallback(async () => {
    if (!user) return { success: false, error: "No user" };

    try {
      // Clear all availability exceptions
      const { error: deleteExceptionsError } = await supabase
        .from("user_availability_exceptions")
        .delete()
        .eq("user_id", user.id);

      if (deleteExceptionsError) {
        console.error("Error deleting exceptions:", deleteExceptionsError);
        throw deleteExceptionsError;
      }

      // Clear all time slots
      const { error: deleteSlotsError } = await supabase
        .from("user_time_slots")
        .delete()
        .eq("user_id", user.id);

      if (deleteSlotsError) {
        console.error("Error deleting time slots:", deleteSlotsError);
        throw deleteSlotsError;
      }

      // Clear local availability state
      setAvailability({});

      // Clear cache since we're resetting everything
      clearCache(user.id);

      // Reset loading steps to force reload
      setLoadingSteps({
        workingHours: false,
        settings: false,
        exceptions: false,
        timeSlots: false,
      });

      return { success: true };
    } catch (error) {
      console.error("Error resetting calendar:", error);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Update overall loading state when all steps are complete
  useEffect(() => {
    if (isFullyLoaded) {
      setIsLoading(false);
    }
  }, [isFullyLoaded]);

  // Cache control functions
  const clearCalendarCache = useCallback(() => {
    if (user) {
      clearCache(user.id);
      console.log("Calendar cache cleared");
    }
  }, [user]);

  const refreshFromDatabase = useCallback(async () => {
    if (user) {
      return await loadAvailability(true); // Force refresh from database
    }
    return { success: false, error: "No user" };
  }, [user, loadAvailability]);

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
    resetCalendarToDefaults,
    setAvailability,
    markTimeSlotsLoaded: () => {
      setLoadingSteps((prev) => ({ ...prev, timeSlots: true }));
    },
    refreshCalendar: () => {
      // This will trigger a re-render and regenerate time slots
      setAvailability({});
    },
    // Cache control functions
    clearCalendarCache,
    refreshFromDatabase,
    // Optimized batch functions
    loadTimeSlotsForMonth,
    processMonthDays,
  };
}
