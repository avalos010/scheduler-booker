import { useState, useCallback, useEffect, useMemo } from "react";
import {
  ClientAvailabilityService,
  type UserWorkingHour,
} from "../services/clientAvailabilityService";
import { TimeSlotUtils } from "../utils/timeSlotUtils";
import type {
  TimeSlot,
  DayAvailability,
  WorkingHours,
  AvailabilitySettings,
  LoadingSteps,
} from "../types/availability";

// Move the processMultipleDays function here to avoid importing availabilityManager
function processMultipleDays(
  days: Date[],
  workingHours: WorkingHours[],
  settings: AvailabilitySettings,
  exceptionsMap: Map<string, { is_available: boolean; reason?: string }>,
  slotsMap: Map<string, TimeSlot[]>,
  userId?: string
): Record<string, DayAvailability> {
  const newAvailability: Record<string, DayAvailability> = {};

  for (const day of days) {
    const dateKey = TimeSlotUtils.formatDateKey(day);
    const exception = exceptionsMap.get(dateKey);
    const existingSlots = slotsMap.get(dateKey) || [];

    const dayAvailability = TimeSlotUtils.processDayAvailability(
      day,
      workingHours,
      settings,
      exception,
      existingSlots,
      userId
    );

    newAvailability[dateKey] = dayAvailability;
  }

  return newAvailability;
}

export function useAvailability() {
  // State
  const [availability, setAvailability] = useState<
    Record<string, DayAvailability>
  >({});
  interface Booking {
    id: string;
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    notes?: string;
    status: "pending" | "confirmed" | "cancelled" | "completed" | "no-show";
    created_at: string;
    updated_at: string;
  }

  const [bookings] = useState<Record<string, Booking[]>>({});
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [settings, setSettings] = useState<AvailabilitySettings>({
    slotDuration: 0,
    breakDuration: 0,
    advanceBookingDays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadingSteps, setLoadingSteps] = useState<LoadingSteps>({
    workingHours: false,
    settings: false,
    exceptions: false,
    timeSlots: false,
  });

  // Computed values
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

  // Load availability data
  const loadAvailability = useCallback(async () => {
    console.log("🔄 loadAvailability called");

    try {
      console.log("📡 Loading working hours and settings...");

      // Load working hours and settings using the new client service
      const [workingHoursData, settingsData] = await Promise.all([
        ClientAvailabilityService.loadWorkingHours(),
        ClientAvailabilityService.loadSettings(),
      ]);

      console.log("📥 Data loaded successfully:", {
        workingHoursCount: workingHoursData?.length,
        settings: settingsData,
      });

      // Only set data if we actually received it from the database
      if (workingHoursData && workingHoursData.length > 0) {
        // Convert working hours to the expected format
        const convertedWorkingHours = workingHoursData.map(
          (wh: UserWorkingHour) => ({
            day: [
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ][wh.day_of_week],
            startTime: wh.start_time,
            endTime: wh.end_time,
            isWorking: wh.is_working,
          })
        );

        setWorkingHours(convertedWorkingHours);
        setLoadingSteps((prev) => ({ ...prev, workingHours: true }));
      } else {
        console.warn(
          "⚠️ No working hours found in database, creating defaults"
        );
        // Create default working hours if none exist
        await ClientAvailabilityService.createDefaultWorkingHours();
        // Reload the data
        const defaultWorkingHours =
          await ClientAvailabilityService.loadWorkingHours();
        if (defaultWorkingHours && defaultWorkingHours.length > 0) {
          const convertedWorkingHours = defaultWorkingHours.map(
            (wh: UserWorkingHour) => ({
              day: [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ][wh.day_of_week],
              startTime: wh.start_time,
              endTime: wh.end_time,
              isWorking: wh.is_working,
            })
          );
          setWorkingHours(convertedWorkingHours);
        }
        setLoadingSteps((prev) => ({ ...prev, workingHours: true }));
      }

      if (settingsData && settingsData.length > 0) {
        // Convert settings to the expected format
        const convertedSettings = {
          slotDuration: settingsData[0].slot_duration_minutes,
          breakDuration: settingsData[0].break_duration_minutes,
          advanceBookingDays: settingsData[0].advance_booking_days,
        };

        setSettings(convertedSettings);
        setLoadingSteps((prev) => ({ ...prev, settings: true }));
      } else {
        console.warn("⚠️ No settings found in database, creating defaults");
        // Create default settings if none exist
        await ClientAvailabilityService.createDefaultSettings();
        // Reload the data
        const defaultSettings = await ClientAvailabilityService.loadSettings();
        if (defaultSettings && defaultSettings.length > 0) {
          const convertedSettings = {
            slotDuration: defaultSettings[0].slot_duration_minutes,
            breakDuration: defaultSettings[0].break_duration_minutes,
            advanceBookingDays: defaultSettings[0].advance_booking_days,
          };
          setSettings(convertedSettings);
        }
        setLoadingSteps((prev) => ({ ...prev, settings: true }));
      }

      // Mark exceptions and time slots as loaded
      setLoadingSteps((prev) => ({
        ...prev,
        exceptions: true,
        timeSlots: true,
      }));
    } catch (error) {
      console.error("❌ Error loading availability data:", error);

      // Don't set fallback data on error - let the UI show the error state
      setLoadingSteps({
        workingHours: true,
        settings: true,
        exceptions: true,
        timeSlots: true,
      });
    }
  }, []);

  // Load data on hook initialization
  useEffect(() => {
    console.log("🔄 useAvailability hook initialized, loading data...");
    loadAvailability();
  }, [loadAvailability]);

  // Save availability data
  const saveAvailability = useCallback(async () => {
    // This function is no longer needed as data is managed by ClientAvailabilityService
    // and the cache service.
    // Keeping it for now, but it will likely be removed in a future edit.
    console.warn(
      "saveAvailability is deprecated. Data is managed by ClientAvailabilityService."
    );
    return { success: true, message: "Data saved successfully (no-op)" };
  }, []);

  // Load bookings for a date range
  const loadBookingsForMonth = useCallback(
    async (startDate: Date, endDate: Date) => {
      try {
        const startDateStr = TimeSlotUtils.formatDateKey(startDate);
        const endDateStr = TimeSlotUtils.formatDateKey(endDate);

        console.log("📅 Loading bookings for month:", {
          startDateStr,
          endDateStr,
        });

        // Use server-side API that handles user authentication
        const response = await fetch(
          `/api/availability/bookings-for-month?startDate=${encodeURIComponent(
            startDateStr
          )}&endDate=${encodeURIComponent(endDateStr)}`
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch bookings: ${response.status}`);
        }

        const data = await response.json();
        console.log("📅 Bookings loaded:", data);

        // The API already returns bookings grouped by date
        return data.bookings || {};
      } catch (error) {
        console.error("Failed to load bookings:", error);
        return {};
      }
    },
    []
  );

  // Optimized month loading
  const loadTimeSlotsForMonth = useCallback(
    async (startDate: Date, endDate: Date) => {
      try {
        const startDateStr = TimeSlotUtils.formatDateKey(startDate);
        const endDateStr = TimeSlotUtils.formatDateKey(endDate);

        const monthData =
          await ClientAvailabilityService.loadTimeSlotsForDateRange(
            startDateStr,
            endDateStr
          );

        // Convert the data to the expected format
        const exceptionsMap = new Map();
        const slotsMap = new Map();

        // Process exceptions
        monthData.exceptions?.forEach(
          (exception: {
            date: string;
            is_available: boolean;
            reason?: string;
          }) => {
            exceptionsMap.set(exception.date, {
              is_available: exception.is_available,
              reason: exception.reason,
            });
          }
        );

        // Process time slots
        monthData.timeSlots?.forEach(
          (slot: {
            date: string;
            id: string;
            start_time: string;
            end_time: string;
            is_available: boolean;
            is_booked?: boolean;
          }) => {
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
          }
        );

        return { exceptionsMap, slotsMap };
      } catch (error) {
        console.error("Failed to load month data:", error);
        return {
          exceptionsMap: new Map(),
          slotsMap: new Map(),
        };
      }
    },
    []
  );

  // Process multiple days with batched data
  const processMonthDays = useCallback(
    async (
      days: Date[],
      exceptionsMap: Map<string, { is_available: boolean; reason?: string }>,
      slotsMap: Map<string, TimeSlot[]>
    ) => {
      // Get userId for consistent slot ID generation from server
      let userId: string | undefined;
      try {
        const response = await fetch("/api/auth/user-id");
        if (response.ok) {
          const data = await response.json();
          userId = data.userId;
        }
      } catch (error) {
        console.warn("Could not get user ID for slot generation:", error);
      }

      const newAvailability = processMultipleDays(
        days,
        workingHours,
        settings,
        exceptionsMap,
        slotsMap,
        userId
      );

      // Update state with all processed days at once
      setAvailability((prev) => {
        const updated = { ...prev, ...newAvailability };
        return updated;
      });
    },
    [workingHours, settings]
  );

  // Update availability for a specific date
  const updateDayAvailability = useCallback(
    (date: Date, updates: Partial<DayAvailability>) => {
      const dateKey = TimeSlotUtils.formatDateKey(date);
      setAvailability((prev) => {
        const updated = {
          ...prev,
          [dateKey]: {
            ...prev[dateKey],
            ...updates,
            date,
          },
        };
        // Cache is now managed by ClientAvailabilityService
        return updated;
      });
    },
    []
  );

  // Toggle working day status
  const toggleWorkingDay = useCallback(
    async (date: Date) => {
      if (workingHours.length === 0) return;

      // Get userId for consistent slot ID generation from server
      let userId: string | undefined;
      try {
        const response = await fetch("/api/auth/user-id");
        if (response.ok) {
          const data = await response.json();
          userId = data.userId;
        }
      } catch (error) {
        console.warn("Could not get user ID for slot generation:", error);
      }

      const dateKey = TimeSlotUtils.formatDateKey(date);
      const currentDay = availability[dateKey];

      if (currentDay) {
        const newIsWorking = !currentDay.isWorkingDay;
        let newTimeSlots = currentDay.timeSlots;

        // If making it a working day, generate default time slots
        if (newIsWorking && currentDay.timeSlots.length === 0) {
          const dayHours = TimeSlotUtils.getWorkingHoursForDate(
            date,
            workingHours
          );
          if (dayHours) {
            newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
              dayHours.startTime,
              dayHours.endTime,
              settings.slotDuration
            );
          } else {
            newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
              "09:00",
              "17:00",
              settings.slotDuration
            );
          }
        }

        // Update local state
        updateDayAvailability(date, {
          isWorkingDay: newIsWorking,
          timeSlots: newTimeSlots,
        });

        // Save to database via API
        try {
          await ClientAvailabilityService.saveException({
            date: TimeSlotUtils.formatDateKey(date),
            is_available: newIsWorking,
          });

          if (newIsWorking && newTimeSlots.length > 0) {
            console.log("💾 About to save time slots:", {
              date: TimeSlotUtils.formatDateKey(date),
              slotCount: newTimeSlots.length,
              sampleSlot: newTimeSlots[0],
              allSlots: newTimeSlots,
            });

            const slotsToSave = newTimeSlots.map((slot) => ({
              start_time: slot.startTime,
              end_time: slot.endTime,
              is_available: slot.isAvailable,
            }));

            console.log("🔍 Transformed slots for API:", {
              originalSlots: newTimeSlots,
              transformedSlots: slotsToSave,
              sampleOriginal: newTimeSlots[0],
              sampleTransformed: slotsToSave[0],
            });

            await ClientAvailabilityService.saveTimeSlots(
              TimeSlotUtils.formatDateKey(date),
              slotsToSave
            );
          } else if (!newIsWorking) {
            // If making day non-working, delete existing time slots
            console.log(
              "🗑️ Day is now non-working, deleting time slots for:",
              TimeSlotUtils.formatDateKey(date)
            );
            await ClientAvailabilityService.deleteTimeSlotsForDate(
              TimeSlotUtils.formatDateKey(date)
            );
          }
        } catch (error) {
          console.error("Failed to save day exception:", error);
        }
      } else {
        // Create new day entry
        const dayHours = TimeSlotUtils.getWorkingHoursForDate(
          date,
          workingHours
        );
        const newIsWorking = !(dayHours?.isWorking ?? false);
        let newTimeSlots: TimeSlot[] = [];

        if (newIsWorking) {
          if (dayHours) {
            newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
              dayHours.startTime,
              dayHours.endTime,
              settings.slotDuration
            );
          } else {
            newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
              "09:00",
              "17:00",
              settings.slotDuration
            );
          }
        }

        // Update local state
        updateDayAvailability(date, {
          isWorkingDay: newIsWorking,
          timeSlots: newTimeSlots,
        });

        // Save to database via API
        try {
          await ClientAvailabilityService.saveException({
            date: TimeSlotUtils.formatDateKey(date),
            is_available: newIsWorking,
          });

          if (newIsWorking) {
            if (dayHours) {
              newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
                dayHours.startTime,
                dayHours.endTime,
                settings.slotDuration
              );
            } else {
              newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
                "09:00",
                "17:00",
                settings.slotDuration
              );
            }
          }

          if (newTimeSlots.length > 0) {
            console.log("💾 About to save time slots (new day):", {
              date: TimeSlotUtils.formatDateKey(date),
              slotCount: newTimeSlots.length,
              sampleSlot: newTimeSlots[0],
              allSlots: newTimeSlots,
            });

            const slotsToSave = newTimeSlots.map((slot) => ({
              start_time: slot.startTime,
              end_time: slot.endTime,
              is_available: slot.isAvailable,
            }));

            console.log("🔍 Transformed slots for API (new day):", {
              originalSlots: newTimeSlots,
              transformedSlots: slotsToSave,
              sampleOriginal: newTimeSlots[0],
              sampleTransformed: slotsToSave[0],
            });

            await ClientAvailabilityService.saveTimeSlots(
              TimeSlotUtils.formatDateKey(date),
              slotsToSave
            );
          } else if (!newIsWorking) {
            // If making day non-working, delete any existing time slots
            console.log(
              "🗑️ New day is non-working, deleting any existing time slots for:",
              TimeSlotUtils.formatDateKey(date)
            );
            await ClientAvailabilityService.deleteTimeSlotsForDate(
              TimeSlotUtils.formatDateKey(date)
            );
          }
        } catch (error) {
          console.error("Failed to save new day exception:", error);
        }
      }
    },
    [workingHours, settings.slotDuration, availability, updateDayAvailability]
  );

  // Toggle time slot availability
  const toggleTimeSlot = useCallback(
    async (date: Date, slotId: string) => {
      console.log("🔄 toggleTimeSlot called:", { date, slotId });

      const dateKey = TimeSlotUtils.formatDateKey(date);
      const currentDay = availability[dateKey];

      console.log("🔍 Current day data:", { dateKey, currentDay });

      if (currentDay) {
        const updatedSlots = currentDay.timeSlots.map((slot) =>
          slot.id === slotId
            ? { ...slot, isAvailable: !slot.isAvailable }
            : slot
        );

        console.log("📝 Updated slots:", { updatedSlots });

        // Update local state
        updateDayAvailability(date, { timeSlots: updatedSlots });

        // Save to database via API
        try {
          const slotToUpdate = updatedSlots.find((slot) => slot.id === slotId);
          if (slotToUpdate) {
            console.log("💾 Saving slot to database:", slotToUpdate);
            await ClientAvailabilityService.updateTimeSlot({
              date: TimeSlotUtils.formatDateKey(date),
              start_time: slotToUpdate.startTime,
              end_time: slotToUpdate.endTime,
              is_available: slotToUpdate.isAvailable,
            });
            console.log("✅ Slot saved successfully");
          } else {
            console.warn("⚠️ Slot not found for update");
          }
        } catch (error) {
          console.error("❌ Failed to update time slot:", error);
        }
      } else {
        console.warn("⚠️ No current day data found for date:", date);
      }
    },
    [availability, updateDayAvailability]
  );

  // Regenerate slots for a specific day with custom parameters
  const regenerateDaySlots = useCallback(
    async (
      date: Date,
      startTime: string,
      endTime: string,
      slotDuration: number
    ) => {
      console.log("🔄 regenerateDaySlots called:", {
        date,
        startTime,
        endTime,
        slotDuration,
      });

      const newSlots = TimeSlotUtils.generateDefaultTimeSlots(
        startTime,
        endTime,
        slotDuration
      );

      console.log("📝 Generated new slots:", {
        slotCount: newSlots.length,
        sampleSlot: newSlots[0],
      });

      // Update local state
      updateDayAvailability(date, {
        isWorkingDay: true,
        timeSlots: newSlots,
      });

      // Save to database via API
      try {
        if (newSlots.length > 0) {
          const slotsToSave = newSlots.map((slot) => ({
            start_time: slot.startTime,
            end_time: slot.endTime,
            is_available: slot.isAvailable,
          }));

          console.log("💾 Saving regenerated slots to database:", {
            date: TimeSlotUtils.formatDateKey(date),
            slotCount: slotsToSave.length,
            sampleSlot: slotsToSave[0],
          });

          console.log("🔍 Debug - Original newSlots:", newSlots);
          console.log("🔍 Debug - Transformed slotsToSave:", slotsToSave);
          console.log("🔍 Debug - First slot before transform:", newSlots[0]);
          console.log("🔍 Debug - First slot after transform:", slotsToSave[0]);

          await ClientAvailabilityService.saveTimeSlots(
            TimeSlotUtils.formatDateKey(date),
            slotsToSave
          );

          console.log("✅ Regenerated slots saved successfully");
        } else {
          console.warn("⚠️ No slots generated, nothing to save");
        }

        return { success: true };
      } catch (error) {
        console.error("❌ Failed to save regenerated slots:", error);
        return { success: false, error };
      }
    },
    [updateDayAvailability]
  );

  // Update working hours
  const updateWorkingHours = useCallback(
    (index: number, field: keyof WorkingHours, value: string | boolean) => {
      if (workingHours.length === 0) return;

      setWorkingHours((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };

        // Cache is now managed by ClientAvailabilityService
        return updated;
      });
    },
    [workingHours.length]
  );

  // Update settings
  const updateSettings = useCallback(
    (updates: Partial<AvailabilitySettings>) => {
      if (settings.slotDuration === 0) return;

      setSettings((prev) => {
        const updated = { ...prev, ...updates };

        // Cache is now managed by ClientAvailabilityService
        return updated;
      });
    },
    [settings.slotDuration]
  );

  // Reset calendar to defaults
  const resetCalendarToDefaults = useCallback(async () => {
    // This function is no longer needed as data is managed by ClientAvailabilityService
    // and the cache service.
    // Keeping it for now, but it will likely be removed in a future edit.
    console.warn(
      "resetCalendarToDefaults is deprecated. Data is managed by ClientAvailabilityService."
    );
    return { success: true, message: "Calendar reset to defaults (no-op)" };
  }, []);

  // Cache control functions
  const clearCalendarCache = useCallback(() => {
    // Cache is now managed by ClientAvailabilityService
    console.log("Calendar cache cleared (no-op)");
  }, []);

  const refreshFromDatabase = useCallback(async () => {
    // This function is no longer needed as data is managed by ClientAvailabilityService
    // and the cache service.
    // Keeping it for now, but it will likely be removed in a future edit.
    console.warn(
      "refreshFromDatabase is deprecated. Data is managed by ClientAvailabilityService."
    );
    return { success: true, message: "Refreshed from database (no-op)" };
  }, []);

  // Update loading state
  useEffect(() => {
    if (isFullyLoaded) {
      setIsLoading(false);
    }
  }, [isFullyLoaded]);

  return {
    // State
    availability,
    bookings,
    workingHours,
    settings,
    isLoading,
    isFullyLoaded,
    loadingSteps,

    // Actions
    updateDayAvailability,
    toggleTimeSlot,
    toggleWorkingDay,
    updateWorkingHours,
    updateSettings,
    saveAvailability,
    loadAvailability,
    resetCalendarToDefaults,
    setAvailability,

    // Optimized batch functions
    loadTimeSlotsForMonth,
    loadBookingsForMonth,
    processMonthDays,

    // Cache control
    clearCalendarCache,
    refreshFromDatabase,

    // Utilities
    markTimeSlotsLoaded: () => {
      setLoadingSteps((prev) => ({ ...prev, timeSlots: true }));
    },
    refreshCalendar: () => {
      setAvailability({});
    },

    // Per-day utilities
    regenerateDaySlots,
  };
}
