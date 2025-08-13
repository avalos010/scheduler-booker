import { useState, useCallback, useEffect, useMemo } from "react";
import { useAuth } from "./useAuth";
import { AvailabilityManager } from "../managers/availabilityManager";
import { CacheService } from "../services/cacheService";
import { TimeSlotUtils } from "../utils/timeSlotUtils";
import type {
  TimeSlot,
  DayAvailability,
  WorkingHours,
  AvailabilitySettings,
  LoadingSteps,
} from "../types/availability";

export function useAvailability() {
  const { user } = useAuth();

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
  const loadAvailability = useCallback(
    async (forceRefresh = false) => {
      if (!user) return;

      console.log("🔄 loadAvailability called for user:", user.id);

      try {
        // Comment out cache for now to focus on DB loading
        // const result = await AvailabilityManager.loadAvailabilityData(
        //   user.id,
        //   forceRefresh
        // );

        // Force refresh from database
        console.log("📡 Calling AvailabilityManager.loadAvailabilityData...");
        const result = await AvailabilityManager.loadAvailabilityData(
          user.id,
          true // Always force refresh
        );

        console.log("📥 AvailabilityManager result:", result);

        if (result.success && "data" in result && result.data) {
          console.log("✅ Data loaded successfully:", {
            workingHoursCount: result.data.workingHours?.length,
            settings: result.data.settings,
            availabilityCount: Object.keys(result.data.availability || {})
              .length,
          });

          setAvailability(result.data.availability);
          setWorkingHours(result.data.workingHours);
          setSettings(result.data.settings);

          // Add a delay before marking as fully loaded to prevent flash
          setTimeout(() => {
            setLoadingSteps({
              workingHours: true,
              settings: true,
              exceptions: true,
              timeSlots: true,
            });
          }, 800); // 800ms delay to allow calendar to process and render
        } else {
          console.error(
            "❌ AvailabilityManager returned error:",
            "error" in result ? result.error : "Unknown error"
          );
        }
      } catch (error) {
        console.error("💥 Error in loadAvailability:", error);
      }
    },
    [user]
  );

  // Save availability data
  const saveAvailability = useCallback(async () => {
    if (!user) return { success: false, error: "No user" };

    try {
      const result = await AvailabilityManager.saveAvailabilityData(
        user.id,
        settings,
        workingHours
      );

      if (result.success) {
        // Clear availability to force regeneration
        setAvailability({});
      }

      return result;
    } catch (error) {
      console.error("Error in saveAvailability:", error);
      return { success: false, error };
    }
  }, [user, settings, workingHours]);

  // Optimized month loading
  const loadTimeSlotsForMonth = useCallback(
    async (startDate: Date, endDate: Date) => {
      if (!user) return null;
      return await AvailabilityManager.loadMonthData(
        user.id,
        startDate,
        endDate
      );
    },
    [user]
  );

  // Process multiple days with batched data
  const processMonthDays = useCallback(
    async (
      days: Date[],
      exceptionsMap: Map<string, { is_available: boolean; reason?: string }>,
      slotsMap: Map<string, TimeSlot[]>
    ) => {
      const newAvailability = AvailabilityManager.processMultipleDays(
        days,
        workingHours,
        settings,
        exceptionsMap,
        slotsMap
      );

      // Update state with all processed days at once
      setAvailability((prev) => {
        const updated = { ...prev, ...newAvailability };
        // Comment out cache for now to focus on DB loading
        // if (user) {
        //   CacheService.updateAvailability(user.id, updated);
        // }
        return updated;
      });
    },
    [user, workingHours, settings]
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
        if (user) {
          CacheService.updateAvailability(user.id, updated);
        }
        return updated;
      });
    },
    [user]
  );

  // Toggle time slot availability
  const toggleTimeSlot = useCallback(
    async (date: Date, slotId: string) => {
      if (!user) return;

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

        // Save to database
        const slotToUpdate = updatedSlots.find((slot) => slot.id === slotId);
        if (slotToUpdate) {
          await AvailabilityManager.updateTimeSlot(user.id, date, slotToUpdate);
        }
      }
    },
    [user, availability, updateDayAvailability]
  );

  // Toggle working day status
  const toggleWorkingDay = useCallback(
    async (date: Date) => {
      if (!user || workingHours.length === 0) return;

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

        // Save to database
        await AvailabilityManager.saveDayException(
          user.id,
          date,
          newIsWorking,
          newTimeSlots
        );
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

        // Save to database
        await AvailabilityManager.saveDayException(
          user.id,
          date,
          newIsWorking,
          newTimeSlots
        );
      }
    },
    [
      user,
      workingHours,
      settings.slotDuration,
      availability,
      updateDayAvailability,
    ]
  );

  // Regenerate slots for a specific day with custom parameters
  const regenerateDaySlots = useCallback(
    async (
      date: Date,
      startTime: string,
      endTime: string,
      slotDuration: number
    ) => {
      if (!user) return { success: false, error: "No user" };

      const newSlots = TimeSlotUtils.generateDefaultTimeSlots(
        startTime,
        endTime,
        slotDuration
      );

      updateDayAvailability(date, {
        isWorkingDay: true,
        timeSlots: newSlots,
      });

      await AvailabilityManager.saveDaySlots(user.id, date, newSlots);

      return { success: true };
    },
    [user, updateDayAvailability]
  );

  // Update working hours
  const updateWorkingHours = useCallback(
    (index: number, field: keyof WorkingHours, value: string | boolean) => {
      if (workingHours.length === 0) return;

      setWorkingHours((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };

        if (user) {
          CacheService.updateWorkingHours(user.id, updated);
        }

        return updated;
      });
    },
    [workingHours.length, user]
  );

  // Update settings
  const updateSettings = useCallback(
    (updates: Partial<AvailabilitySettings>) => {
      if (settings.slotDuration === 0) return;

      setSettings((prev) => {
        const updated = { ...prev, ...updates };

        if (user) {
          CacheService.updateSettings(user.id, updated);
        }

        return updated;
      });
    },
    [settings.slotDuration, user]
  );

  // Reset calendar to defaults
  const resetCalendarToDefaults = useCallback(async () => {
    if (!user) return { success: false, error: "No user" };

    const result = await AvailabilityManager.resetToDefaults(user.id);

    if (result.success) {
      setAvailability({});
      setLoadingSteps({
        workingHours: false,
        settings: false,
        exceptions: false,
        timeSlots: false,
      });
    }

    return result;
  }, [user]);

  // Cache control functions
  const clearCalendarCache = useCallback(() => {
    if (user) {
      CacheService.clearCache(user.id);
      console.log("Calendar cache cleared");
    }
  }, [user]);

  const refreshFromDatabase = useCallback(async () => {
    if (user) {
      return await loadAvailability(true);
    }
    return { success: false, error: "No user" };
  }, [user, loadAvailability]);

  // Load data on mount
  useEffect(() => {
    console.log("🚀 useEffect for initial load triggered:", {
      user: !!user,
      userId: user?.id,
      userEmail: user?.email,
      timestamp: new Date().toISOString(),
    });

    if (user) {
      console.log("👤 User available, calling loadAvailability");
      loadAvailability();
    } else {
      console.log("⏳ No user available, skipping loadAvailability");
    }
  }, [user, loadAvailability]);

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
