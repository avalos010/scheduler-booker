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
  slotsMap: Map<string, TimeSlot[]>
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
      existingSlots
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

      // Convert working hours to the expected format
      const convertedWorkingHours =
        workingHoursData?.map((wh: UserWorkingHour) => ({
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
        })) || [];

      // Convert settings to the expected format
      const convertedSettings = settingsData?.[0]
        ? {
            slotDuration: settingsData[0].slot_duration_minutes,
            breakDuration: settingsData[0].break_duration_minutes,
            advanceBookingDays: settingsData[0].advance_booking_days,
          }
        : {
            slotDuration: 60,
            breakDuration: 60,
            advanceBookingDays: 30,
          };

      setWorkingHours(convertedWorkingHours);
      setSettings(convertedSettings);

      // Mark as fully loaded
      setTimeout(() => {
        setLoadingSteps({
          workingHours: true,
          settings: true,
          exceptions: true,
          timeSlots: true,
        });
      }, 800);
    } catch (error) {
      console.error("❌ Error loading availability data:", error);

      // Set default data on error
      setLoadingSteps({
        workingHours: true,
        settings: true,
        exceptions: true,
        timeSlots: true,
      });
    }
  }, []);

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
    (
      days: Date[],
      exceptionsMap: Map<string, { is_available: boolean; reason?: string }>,
      slotsMap: Map<string, TimeSlot[]>
    ) => {
      const newAvailability = processMultipleDays(
        days,
        workingHours,
        settings,
        exceptionsMap,
        slotsMap
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

          if (newTimeSlots.length > 0) {
            await ClientAvailabilityService.saveTimeSlots(
              newTimeSlots.map((slot) => ({
                date: TimeSlotUtils.formatDateKey(date),
                start_time: slot.startTime,
                end_time: slot.endTime,
                is_available: slot.isAvailable,
              }))
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

          if (newTimeSlots.length > 0) {
            await ClientAvailabilityService.saveTimeSlots(
              newTimeSlots.map((slot) => ({
                date: TimeSlotUtils.formatDateKey(date),
                start_time: slot.startTime,
                end_time: slot.endTime,
                is_available: slot.isAvailable,
              }))
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
      const dateKey = TimeSlotUtils.formatDateKey(date);
      const currentDay = availability[dateKey];

      if (currentDay) {
        const updatedSlots = currentDay.timeSlots.map((slot) =>
          slot.id === slotId
            ? { ...slot, isAvailable: !slot.isAvailable }
            : slot
        );

        // Update local state
        updateDayAvailability(date, { timeSlots: updatedSlots });

        // Save to database via API
        try {
          const slotToUpdate = updatedSlots.find((slot) => slot.id === slotId);
          if (slotToUpdate) {
            await ClientAvailabilityService.updateTimeSlot({
              date: TimeSlotUtils.formatDateKey(date),
              start_time: slotToUpdate.startTime,
              end_time: slotToUpdate.endTime,
              is_available: slotToUpdate.isAvailable,
            });
          }
        } catch (error) {
          console.error("Failed to update time slot:", error);
        }
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
      const newSlots = TimeSlotUtils.generateDefaultTimeSlots(
        startTime,
        endTime,
        slotDuration
      );

      updateDayAvailability(date, {
        isWorkingDay: true,
        timeSlots: newSlots,
      });

      // Save to database via API (will implement later)
      console.log("Regenerating day slots:", {
        date,
        startTime,
        endTime,
        slotDuration,
        slots: newSlots,
      });
      return { success: true };
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

  // Load data on mount
  useEffect(() => {
    console.log("🚀 useEffect for initial load triggered");
    loadAvailability();
  }, [loadAvailability]);

  // Update loading state
  useEffect(() => {
    if (isFullyLoaded) {
      setIsLoading(false);
    }
  }, [isFullyLoaded]);

  return {
    // State
    availability,
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
