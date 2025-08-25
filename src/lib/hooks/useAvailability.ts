import { useState, useCallback, useEffect, useMemo } from "react";
import { useAvailabilityData } from "./useAvailabilityData";
import { useAvailabilityActions } from "./useAvailabilityActions";
import { TimeSlotUtils } from "../utils/timeSlotUtils";
import type {
  TimeSlot,
  DayAvailability,
  WorkingHours,
  AvailabilitySettings,
  LoadingSteps,
} from "../types/availability";

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

export function useAvailability() {
  // Core State
  const [availability, setAvailability] = useState<
    Record<string, DayAvailability>
  >({});
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({});
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

  // Data loading hooks
  const {
    loadAvailability,
    loadBookingsForMonth,
    loadTimeSlotsForMonth,
    processMonthDays,
  } = useAvailabilityData({
    setWorkingHours,
    setSettings,
    setLoadingSteps,
    setAvailability,
    workingHours,
    settings,
  });

  // Function to load bookings and update state
  const loadAndSetBookings = useCallback(
    async (startDate: Date, endDate: Date) => {
      const fetchedBookings = await loadBookingsForMonth(startDate, endDate);
      // Merge with existing bookings to avoid losing data from other months
      setBookings((prev) => ({ ...prev, ...fetchedBookings }));
    },
    [loadBookingsForMonth]
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
        return updated;
      });
    },
    []
  );

  // Action hooks
  const { toggleWorkingDay, toggleTimeSlot, regenerateDaySlots } =
    useAvailabilityActions({
      availability,
      workingHours,
      settings,
      updateDayAvailability,
      loadTimeSlotsForMonth,
      processMonthDays,
    });

  // Load data on hook initialization
  useEffect(() => {
    console.log("🔄 useAvailability hook initialized, loading data...");
    loadAvailability();
  }, [loadAvailability]);

  // Update loading state
  useEffect(() => {
    if (isFullyLoaded) {
      setIsLoading(false);
    }
  }, [isFullyLoaded]);

  // Utility functions
  const saveAvailability = useCallback(async () => {
    console.warn(
      "saveAvailability is deprecated. Data is managed by ClientAvailabilityService."
    );
    return { success: true, message: "Data saved successfully (no-op)" };
  }, []);

  const updateWorkingHours = useCallback(
    (index: number, field: keyof WorkingHours, value: string | boolean) => {
      if (workingHours.length === 0) return;

      setWorkingHours((prev) => {
        const updated = [...prev];
        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    [workingHours.length]
  );

  const updateSettings = useCallback(
    (updates: Partial<AvailabilitySettings>) => {
      if (settings.slotDuration === 0) return;

      setSettings((prev) => {
        const updated = { ...prev, ...updates };
        return updated;
      });
    },
    [settings.slotDuration]
  );

  const resetCalendarToDefaults = useCallback(async () => {
    console.warn(
      "resetCalendarToDefaults is deprecated. Data is managed by ClientAvailabilityService."
    );
    return { success: true, message: "Calendar reset to defaults (no-op)" };
  }, []);

  const clearCalendarCache = useCallback(() => {
    console.log("Calendar cache cleared (no-op)");
  }, []);

  const refreshFromDatabase = useCallback(async () => {
    console.warn(
      "refreshFromDatabase is deprecated. Data is managed by ClientAvailabilityService."
    );
    return { success: true, message: "Refreshed from database (no-op)" };
  }, []);

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
    loadBookingsForMonth, // Keep this for direct access if needed
    loadAndSetBookings, // Expose the new function
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
