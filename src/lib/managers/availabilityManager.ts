import { AvailabilityService } from "../services/availabilityService";
// import { CacheService } from "../services/cacheService";
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
    console.log(
      "🏗️ AvailabilityManager.loadAvailabilityData called for user:",
      userId
    );

    // Try cache first unless force refresh
    if (!forceRefresh) {
      // const cachedData = CacheService.loadFromCache(userId);
      // if (cachedData) {
      //   console.log("Loading from cache...");
      //   return {
      //     success: true,
      //     fromCache: true,
      //     data: cachedData,
      //   };
      // }
    }

    console.log("📡 Loading from database...");

    try {
      // Load settings
      console.log("⚙️ Loading settings...");
      let settings: AvailabilitySettings;
      const settingsData = await AvailabilityService.loadSettings(userId);

      console.log("📊 Settings data from DB:", settingsData);

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
          advanceBookingDays: settingsToUse.advance_booking_days,
        };

        console.log("✅ Settings loaded:", settings);
      } else {
        console.log("📝 No settings found, creating defaults");
        const defaultSettings = await AvailabilityService.createDefaultSettings(
          userId
        );
        settings = {
          slotDuration: defaultSettings.slot_duration_minutes,
          advanceBookingDays: defaultSettings.advance_booking_days,
        };
        console.log("✅ Default settings created:", settings);

        // Save the default settings to the database so public API can access them
        try {
          await AvailabilityService.saveSettings({
            user_id: userId,
            slot_duration_minutes: defaultSettings.slot_duration_minutes,
            advance_booking_days: defaultSettings.advance_booking_days,
          });
          console.log("✅ Default settings saved to database");
        } catch (error) {
          console.warn(
            "⚠️ Could not save default settings to database:",
            error
          );
        }
      }

      // Load working hours
      console.log("🕐 Loading working hours...");
      let workingHours: WorkingHours[];
      const hoursData = await AvailabilityService.loadWorkingHours(userId);

      console.log("📊 Working hours data from DB:", hoursData);

      if (hoursData && hoursData.length > 0) {
        workingHours = TimeSlotUtils.formatWorkingHoursFromDatabase(hoursData);
        console.log("✅ Working hours loaded:", workingHours);
      } else {
        console.log("📝 No working hours found, creating defaults");
        const defaultHours =
          await AvailabilityService.createDefaultWorkingHours(userId);
        workingHours = TimeSlotUtils.formatWorkingHoursFromDatabase(
          defaultHours || []
        );
        console.log("✅ Default working hours created:", workingHours);

        // Save the default working hours to the database so public API can access them
        try {
          if (defaultHours && defaultHours.length > 0) {
            await AvailabilityService.saveWorkingHours(defaultHours);
            console.log("✅ Default working hours saved to database");
          }
        } catch (error) {
          console.warn(
            "⚠️ Could not save default working hours to database:",
            error
          );
        }
      }

      // Load time slots and exceptions for the current month
      console.log("📅 Loading time slots and exceptions...");
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

      console.log("📅 Date range for loading:", {
        monthStart: monthStart.toISOString(),
        monthEnd: monthEnd.toISOString(),
        monthStartKey: TimeSlotUtils.formatDateKey(monthStart),
        monthEndKey: TimeSlotUtils.formatDateKey(monthEnd),
      });

      const monthData = await this.loadMonthData(userId, monthStart, monthEnd);

      let availability: Record<string, DayAvailability> = {};

      if (monthData) {
        // Generate availability for the current month
        const daysInMonth = [];
        for (
          let d = new Date(monthStart);
          d <= monthEnd;
          d.setDate(d.getDate() + 1)
        ) {
          daysInMonth.push(new Date(d));
        }

        console.log("📅 Processing days:", {
          totalDays: daysInMonth.length,
          sampleDays: daysInMonth
            .slice(0, 3)
            .map((d) => TimeSlotUtils.formatDateKey(d)),
          monthData: monthData,
        });

        availability = this.processMultipleDays(
          daysInMonth,
          workingHours,
          settings,
          monthData.exceptionsMap,
          monthData.slotsMap
        );

        console.log("✅ Generated availability for month:", {
          daysProcessed: Object.keys(availability).length,
          daysWithSlots: Object.values(availability).filter(
            (day) => day.timeSlots.length > 0
          ).length,
          sampleDay: Object.values(availability).find(
            (day) => day.timeSlots.length > 0
          ),
        });
      } else {
        console.log("⚠️ Could not load month data, availability will be empty");
      }

      // If no availability data was generated, create default availability for the current month
      if (Object.keys(availability).length === 0) {
        console.log(
          "📝 No availability data found, generating default availability for current month"
        );
        availability = this.generateDefaultMonthAvailability(
          monthStart,
          monthEnd,
          workingHours,
          settings
        );

        console.log("✅ Generated default availability for month:", {
          daysProcessed: Object.keys(availability).length,
          daysWithSlots: Object.values(availability).filter(
            (day) => day.timeSlots.length > 0
          ).length,
        });
      }

      // Save to cache
      // CacheService.saveToCache(userId, {
      //   availability,
      //   workingHours,
      //   settings,
      //   exceptions: {},
      // });

      const result = {
        success: true,
        fromCache: false,
        data: {
          availability,
          workingHours,
          settings,
          exceptions: {},
        },
      };

      console.log("🎯 AvailabilityManager returning result:", {
        success: result.success,
        workingHoursLength: workingHours.length,
        availabilityKeys: Object.keys(availability).length,
        settings: settings,
        sampleAvailability: Object.entries(availability).slice(0, 2),
        sampleWorkingHours: workingHours.slice(0, 2),
      });

      return result;
    } catch (error) {
      console.error(
        "💥 Error in AvailabilityManager.loadAvailabilityData:",
        error
      );
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
        advance_booking_days: settings.advanceBookingDays,
      });

      // Save working hours
      const workingHoursData = TimeSlotUtils.formatWorkingHoursForDatabase(
        workingHours,
        userId
      );
      await AvailabilityService.saveWorkingHours(workingHoursData);

      // Update cache
      // CacheService.saveToCache(userId, {
      //   availability: {},
      //   workingHours,
      //   settings,
      //   exceptions: {},
      // });

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

      console.log("📅 Loading month data:", {
        userId,
        startDate: startDateKey,
        endDate: endDateKey,
      });

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

      console.log("📅 Month data loaded:", {
        exceptionsCount: exceptionsData?.length || 0,
        slotsCount: slotsData?.length || 0,
        sampleExceptions: exceptionsData?.slice(0, 3) || [],
        sampleSlots: slotsData?.slice(0, 3) || [],
      });

      // Create lookup maps for fast access
      const exceptionsMap = TimeSlotUtils.createExceptionsMap(
        exceptionsData || []
      );
      const slotsMap = TimeSlotUtils.createSlotsMap(slotsData || []);

      console.log("📅 Created lookup maps:", {
        exceptionsMapSize: exceptionsMap.size,
        slotsMapSize: slotsMap.size,
        sampleExceptionsMap: Array.from(exceptionsMap.entries()).slice(0, 2),
        sampleSlotsMap: Array.from(slotsMap.entries()).slice(0, 2),
      });

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
    console.log("🏗️ Processing multiple days:", {
      daysCount: days.length,
      workingHoursCount: workingHours.length,
      exceptionsMapSize: exceptionsMap.size,
      slotsMapSize: slotsMap.size,
      sampleExceptions: Array.from(exceptionsMap.entries()).slice(0, 3),
      sampleSlots: Array.from(slotsMap.entries()).slice(0, 3),
    });

    const newAvailability: Record<string, DayAvailability> = {};

    for (const day of days) {
      const dateKey = TimeSlotUtils.formatDateKey(day);
      const exception = exceptionsMap.get(dateKey);
      const existingSlots = slotsMap.get(dateKey) || [];

      if (existingSlots.length > 0) {
        console.log(
          `📅 Day ${dateKey} has ${existingSlots.length} existing slots`
        );
      }

      const dayAvailability = TimeSlotUtils.processDayAvailability(
        day,
        workingHours,
        settings,
        exception,
        existingSlots
      );

      newAvailability[dateKey] = dayAvailability;
    }

    console.log("🏗️ Finished processing days:", {
      totalDays: Object.keys(newAvailability).length,
      daysWithSlots: Object.values(newAvailability).filter(
        (day) => day.timeSlots.length > 0
      ).length,
      sampleDay: Object.values(newAvailability).find(
        (day) => day.timeSlots.length > 0
      ),
    });

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
   * Replace all slots for a day (used when regenerating custom slots)
   */
  static async saveDaySlots(userId: string, date: Date, timeSlots: TimeSlot[]) {
    try {
      const dateKey = TimeSlotUtils.formatDateKey(date);

      // Clear previous slots for that day
      await AvailabilityService.deleteTimeSlotsForDate(userId, dateKey);

      if (timeSlots.length > 0) {
        await AvailabilityService.saveTimeSlots(
          timeSlots.map((slot) => ({
            user_id: userId,
            date: dateKey,
            start_time: slot.startTime,
            end_time: slot.endTime,
            is_available: slot.isAvailable,
            is_booked: Boolean(slot.isBooked),
          }))
        );
      }

      // Ensure the exception marks the day as working
      await AvailabilityService.saveException({
        user_id: userId,
        date: dateKey,
        is_available: true,
        reason: "Custom day schedule",
      });

      return { success: true };
    } catch (error) {
      console.error("Error saving day slots:", error);
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
      // CacheService.clearCache(userId);

      return { success: true };
    } catch (error) {
      console.error("Error resetting calendar:", error);
      return { success: false, error };
    }
  }

  /**
   * Generate default availability for a month based on working hours and settings
   */
  static generateDefaultMonthAvailability(
    monthStart: Date,
    monthEnd: Date,
    workingHours: WorkingHours[],
    settings: AvailabilitySettings
  ): Record<string, DayAvailability> {
    console.log("🏗️ Generating default month availability:", {
      monthStart: monthStart.toISOString(),
      monthEnd: monthEnd.toISOString(),
      workingHoursCount: workingHours.length,
      settings: settings,
    });

    const availability: Record<string, DayAvailability> = {};
    const daysInMonth = [];

    for (
      let d = new Date(monthStart);
      d <= monthEnd;
      d.setDate(d.getDate() + 1)
    ) {
      daysInMonth.push(new Date(d));
    }

    daysInMonth.forEach((day) => {
      const dateKey = TimeSlotUtils.formatDateKey(day);
      const dayOfWeek = day.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = workingHours[dayIndex];

      if (dayHours?.isWorking) {
        // Generate time slots for working days
        const slots = TimeSlotUtils.generateDefaultTimeSlots(
          dayHours.startTime,
          dayHours.endTime,
          settings.slotDuration
        );

        availability[dateKey] = {
          date: day,
          timeSlots: slots,
          isWorkingDay: true,
        };

        console.log(
          `📅 Generated ${slots.length} slots for ${dateKey} (${dayHours.startTime}-${dayHours.endTime})`
        );
      } else {
        // Non-working day
        availability[dateKey] = {
          date: day,
          timeSlots: [],
          isWorkingDay: false,
        };
      }
    });

    console.log("✅ Default month availability generated:", {
      totalDays: Object.keys(availability).length,
      workingDays: Object.values(availability).filter((day) => day.isWorkingDay)
        .length,
      daysWithSlots: Object.values(availability).filter(
        (day) => day.timeSlots.length > 0
      ).length,
    });

    return availability;
  }
}
