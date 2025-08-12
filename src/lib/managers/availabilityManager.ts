import { AvailabilityService } from "../services/availabilityService";
import { CacheService } from "../services/cacheService";
import { TimeSlotUtils } from "../utils/timeSlotUtils";
import type {
  TimeSlot,
  DayAvailability,
  WorkingHours,
  AvailabilitySettings,
} from "../types/availability";

export class AvailabilityManager {
  /**
   * Load all availability data for a user (with caching)
   */
  static async loadAvailabilityData(userId: string, forceRefresh = false) {
    // Try cache first unless force refresh
    if (!forceRefresh) {
      const cachedData = CacheService.loadFromCache(userId);
      if (cachedData) {
        console.log("Loading from cache...");
        return {
          success: true,
          fromCache: true,
          data: cachedData,
        };
      }
    }

    console.log("Loading from database...");

    try {
      // Load settings
      let settings: AvailabilitySettings;
      const settingsData = await AvailabilityService.loadSettings(userId);

      if (settingsData && settingsData.length > 0) {
        // Handle duplicates if they exist
        const settingsToUse = settingsData[0];

        if (settingsData.length > 1) {
          console.warn(
            "Multiple settings found, using first and cleaning up duplicates"
          );
          // Could add cleanup logic here
        }

        settings = {
          slotDuration: settingsToUse.slot_duration_minutes,
          breakDuration: settingsToUse.break_duration_minutes,
          advanceBookingDays: settingsToUse.advance_booking_days,
        };
      } else {
        console.log("No settings found, creating defaults");
        const defaultSettings = await AvailabilityService.createDefaultSettings(
          userId
        );
        settings = {
          slotDuration: defaultSettings.slot_duration_minutes,
          breakDuration: defaultSettings.break_duration_minutes,
          advanceBookingDays: defaultSettings.advance_booking_days,
        };
      }

      // Load working hours
      let workingHours: WorkingHours[];
      const hoursData = await AvailabilityService.loadWorkingHours(userId);

      if (hoursData && hoursData.length > 0) {
        workingHours = TimeSlotUtils.formatWorkingHoursFromDatabase(hoursData);
      } else {
        console.log("No working hours found, creating defaults");
        const defaultHours =
          await AvailabilityService.createDefaultWorkingHours(userId);
        workingHours = TimeSlotUtils.formatWorkingHoursFromDatabase(
          defaultHours || []
        );
      }

      // Save to cache
      CacheService.saveToCache(userId, {
        availability: {},
        workingHours,
        settings,
        exceptions: {},
      });

      return {
        success: true,
        fromCache: false,
        data: {
          availability: {},
          workingHours,
          settings,
          exceptions: {},
        },
      };
    } catch (error) {
      console.error("Error loading availability:", error);
      return { success: false, error };
    }
  }

  /**
   * Save user settings and working hours
   */
  static async saveAvailabilityData(
    userId: string,
    settings: AvailabilitySettings,
    workingHours: WorkingHours[]
  ) {
    try {
      // Save settings
      await AvailabilityService.saveSettings({
        user_id: userId,
        slot_duration_minutes: settings.slotDuration,
        break_duration_minutes: settings.breakDuration,
        advance_booking_days: settings.advanceBookingDays,
      });

      // Save working hours
      const workingHoursData = TimeSlotUtils.formatWorkingHoursForDatabase(
        workingHours,
        userId
      );
      await AvailabilityService.saveWorkingHours(workingHoursData);

      // Update cache
      CacheService.saveToCache(userId, {
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
  }

  /**
   * Load all time slots and exceptions for a month (optimized batch loading)
   */
  static async loadMonthData(userId: string, startDate: Date, endDate: Date) {
    try {
      const startDateKey = TimeSlotUtils.formatDateKey(startDate);
      const endDateKey = TimeSlotUtils.formatDateKey(endDate);

      // Batch load exceptions and time slots
      const [exceptionsData, slotsData] = await Promise.all([
        AvailabilityService.loadExceptionsForDateRange(
          userId,
          startDateKey,
          endDateKey
        ),
        AvailabilityService.loadTimeSlotsForDateRange(
          userId,
          startDateKey,
          endDateKey
        ),
      ]);

      // Create lookup maps for fast access
      const exceptionsMap = TimeSlotUtils.createExceptionsMap(
        exceptionsData || []
      );
      const slotsMap = TimeSlotUtils.createSlotsMap(slotsData || []);

      return { exceptionsMap, slotsMap };
    } catch (error) {
      console.error("Error loading month data:", error);
      return null;
    }
  }

  /**
   * Process multiple days using batched data
   */
  static processMultipleDays(
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

  /**
   * Save an availability exception (working day override)
   */
  static async saveDayException(
    userId: string,
    date: Date,
    isWorkingDay: boolean,
    timeSlots: TimeSlot[]
  ) {
    try {
      const dateKey = TimeSlotUtils.formatDateKey(date);

      // Save availability exception
      await AvailabilityService.saveException({
        user_id: userId,
        date: dateKey,
        is_available: isWorkingDay,
        reason: isWorkingDay
          ? "Working day override"
          : "Non-working day override",
      });

      // If it's a working day, save time slots
      if (isWorkingDay && timeSlots.length > 0) {
        const slotsData = timeSlots.map((slot) => ({
          user_id: userId,
          date: dateKey,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_available: slot.isAvailable,
        }));

        await AvailabilityService.saveTimeSlots(slotsData);
      } else if (!isWorkingDay) {
        // If it's not a working day, remove any existing time slots
        await AvailabilityService.deleteTimeSlotsForDate(userId, dateKey);
      }

      return { success: true };
    } catch (error) {
      console.error("Error saving day exception:", error);
      return { success: false, error };
    }
  }

  /**
   * Update a single time slot
   */
  static async updateTimeSlot(userId: string, date: Date, slot: TimeSlot) {
    try {
      const dateKey = TimeSlotUtils.formatDateKey(date);

      await AvailabilityService.updateTimeSlot({
        user_id: userId,
        date: dateKey,
        start_time: slot.startTime,
        end_time: slot.endTime,
        is_available: slot.isAvailable,
      });

      return { success: true };
    } catch (error) {
      console.error("Error updating time slot:", error);
      return { success: false, error };
    }
  }

  /**
   * Reset calendar to defaults (clear all exceptions and time slots)
   */
  static async resetToDefaults(userId: string) {
    try {
      // Clear all exceptions and time slots
      await Promise.all([
        AvailabilityService.deleteAllExceptions(userId),
        AvailabilityService.deleteAllTimeSlots(userId),
      ]);

      // Clear cache
      CacheService.clearCache(userId);

      return { success: true };
    } catch (error) {
      console.error("Error resetting calendar:", error);
      return { success: false, error };
    }
  }
}
