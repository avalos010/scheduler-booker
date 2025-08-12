import type {
  TimeSlot,
  WorkingHours,
  AvailabilitySettings,
  DayAvailability,
} from "../types/availability";

export class TimeSlotUtils {
  /**
   * Generates default time slots for a given time range and duration
   */
  static generateDefaultTimeSlots(
    startTime: string,
    endTime: string,
    slotDuration: number
  ): TimeSlot[] {
    const slots: TimeSlot[] = [];

    // Ensure time strings have proper format (add seconds if missing)
    const startTimeFormatted = startTime.includes(":")
      ? startTime
      : `${startTime}:00`;
    const endTimeFormatted = endTime.includes(":") ? endTime : `${endTime}:00`;

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
  }

  /**
   * Maps JavaScript Date.getDay() to working hours array index
   * 0=Sunday becomes 6, 1=Monday becomes 0, etc.
   */
  static getWorkingHoursDayIndex(date: Date): number {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  }

  /**
   * Gets the working hours for a specific date
   */
  static getWorkingHoursForDate(
    date: Date,
    workingHours: WorkingHours[]
  ): WorkingHours | undefined {
    const dayIndex = this.getWorkingHoursDayIndex(date);
    return workingHours[dayIndex];
  }

  /**
   * Formats date to ISO date string (YYYY-MM-DD)
   */
  static formatDateKey(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Creates lookup maps from database results for fast access
   */
  static createExceptionsMap(
    exceptionsData: { date: string; is_available: boolean; reason?: string }[]
  ): Map<string, { is_available: boolean; reason?: string }> {
    const map = new Map();
    if (exceptionsData) {
      exceptionsData.forEach((exception) => {
        map.set(exception.date, exception);
      });
    }
    return map;
  }

  /**
   * Creates time slots lookup map from database results
   */
  static createSlotsMap(
    slotsData: {
      id: string;
      date: string;
      start_time: string;
      end_time: string;
      is_available: boolean;
      is_booked?: boolean;
    }[]
  ): Map<string, TimeSlot[]> {
    const map = new Map();
    if (slotsData) {
      slotsData.forEach((slot) => {
        const dateKey = slot.date;
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey).push({
          id: slot.id,
          startTime: slot.start_time,
          endTime: slot.end_time,
          isAvailable: slot.is_available,
          isBooked: slot.is_booked,
        });
      });
    }
    return map;
  }

  /**
   * Processes a single day's availability based on exceptions and working hours
   */
  static processDayAvailability(
    date: Date,
    workingHours: WorkingHours[],
    settings: AvailabilitySettings,
    exception?: { is_available: boolean; reason?: string },
    existingSlots: TimeSlot[] = []
  ): DayAvailability {
    if (exception) {
      // Use exception data
      if (exception.is_available) {
        if (existingSlots.length > 0) {
          return {
            date,
            timeSlots: existingSlots,
            isWorkingDay: true,
          };
        } else {
          // Generate slots for working day exception
          const dayHours = this.getWorkingHoursForDate(date, workingHours);
          if (dayHours && dayHours.isWorking) {
            const generatedSlots = this.generateDefaultTimeSlots(
              dayHours.startTime,
              dayHours.endTime,
              settings.slotDuration
            );
            return {
              date,
              timeSlots: generatedSlots,
              isWorkingDay: true,
            };
          } else {
            return {
              date,
              timeSlots: [],
              isWorkingDay: true, // Exception overrides default
            };
          }
        }
      } else {
        // Non-working day exception
        return {
          date,
          timeSlots: [],
          isWorkingDay: false,
        };
      }
    } else {
      // No exception, use working hours
      const dayHours = this.getWorkingHoursForDate(date, workingHours);

      if (dayHours && dayHours.isWorking) {
        if (existingSlots.length > 0) {
          // Use existing slots (preserves bookings)
          return {
            date,
            timeSlots: existingSlots,
            isWorkingDay: true,
          };
        } else {
          // Generate new slots
          const generatedSlots = this.generateDefaultTimeSlots(
            dayHours.startTime,
            dayHours.endTime,
            settings.slotDuration
          );
          return {
            date,
            timeSlots: generatedSlots,
            isWorkingDay: true,
          };
        }
      } else {
        // Non-working day
        return {
          date,
          timeSlots: existingSlots, // Preserve any existing bookings
          isWorkingDay: false,
        };
      }
    }
  }

  /**
   * Converts working hours array to database format
   */
  static formatWorkingHoursForDatabase(
    workingHours: WorkingHours[],
    userId: string
  ) {
    return workingHours.map((hour, index) => ({
      user_id: userId,
      day_of_week: index === 6 ? 0 : index + 1, // Monday=1, Tuesday=2, ..., Sunday=0
      start_time: hour.startTime,
      end_time: hour.endTime,
      is_working: hour.isWorking,
    }));
  }

  /**
   * Converts database working hours to frontend format
   */
  static formatWorkingHoursFromDatabase(
    hoursData: {
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_working: boolean;
    }[]
  ): WorkingHours[] {
    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    return dayNames.map((day, index) => {
      // Map array index to day_of_week: Monday=1, Tuesday=2, ..., Sunday=0
      const dayOfWeek = index === 6 ? 0 : index + 1;
      const hourData = hoursData.find((h) => h.day_of_week === dayOfWeek);

      return {
        day,
        startTime: hourData?.start_time || "09:00",
        endTime: hourData?.end_time || "17:00",
        isWorking:
          hourData?.is_working !== undefined ? hourData.is_working : index < 5, // Mon-Fri working by default
      };
    });
  }
}
