import type { TimeSlot } from "../types/availability";

export interface AvailabilityException {
  id?: string;
  user_id: string;
  date: string;
  is_available: boolean;
  reason?: string;
}

export interface UserTimeSlot {
  id?: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  is_booked?: boolean;
}

export interface UserWorkingHour {
  id?: string;
  user_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_working: boolean;
}

export interface UserAvailabilitySettings {
  id?: string;
  user_id: string;
  slot_duration_minutes: number;
  break_duration_minutes: number;
  advance_booking_days: number;
}

export class ClientAvailabilityService {
  // Settings operations
  static async loadSettings() {
    const response = await fetch("/api/availability/settings");
    if (!response.ok) {
      throw new Error("Failed to load settings");
    }
    const data = await response.json();
    return data.settings;
  }

  static async createDefaultSettings() {
    // This will be implemented as an API route later
    const defaultSettings = {
      slot_duration_minutes: 60,
      break_duration_minutes: 60,
      advance_booking_days: 30,
    };
    return defaultSettings;
  }

  static async saveSettings(
    settings: Omit<UserAvailabilitySettings, "user_id">
  ) {
    // This will be implemented as an API route later
    console.log("Saving settings:", settings);
    return settings;
  }

  // Working hours operations
  static async loadWorkingHours() {
    const response = await fetch("/api/availability/working-hours");
    if (!response.ok) {
      throw new Error("Failed to load working hours");
    }
    const data = await response.json();
    return data.workingHours;
  }

  static async createDefaultWorkingHours() {
    // This will be implemented as an API route later
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
    return defaultHours;
  }

  static async saveWorkingHours(
    workingHoursData: Omit<UserWorkingHour, "user_id">[]
  ) {
    // This will be implemented as an API route later
    console.log("Saving working hours:", workingHoursData);
  }

  // Time slots operations
  static async loadTimeSlotsForDateRange(startDate: string, endDate: string) {
    const response = await fetch(
      `/api/availability/days?startDate=${startDate}&endDate=${endDate}`
    );
    if (!response.ok) {
      throw new Error("Failed to load time slots for date range");
    }
    const data = await response.json();
    return data;
  }

  static async loadTimeSlotsForDate(date: string) {
    const response = await fetch(
      `/api/availability/days?startDate=${date}&endDate=${date}`
    );
    if (!response.ok) {
      throw new Error("Failed to load time slots for date");
    }
    const data = await response.json();
    return data.timeSlots || [];
  }

  static async saveTimeSlots(slotsData: Omit<UserTimeSlot, "user_id">[]) {
    if (slotsData.length === 0) return;

    const date = slotsData[0].date;
    const response = await fetch("/api/availability/time-slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date,
        timeSlots: slotsData,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save time slots");
    }
  }

  static async updateTimeSlot(slotData: Omit<UserTimeSlot, "user_id">) {
    // For now, just save all slots for the date
    const response = await fetch("/api/availability/time-slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: slotData.date,
        timeSlots: [slotData],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update time slot");
    }
  }

  static async deleteTimeSlotsForDate(date: string) {
    const response = await fetch("/api/availability/time-slots", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date,
        timeSlots: [],
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to delete time slots for date");
    }
  }

  static async deleteAllTimeSlots() {
    // This would need a separate API endpoint
    console.log("deleteAllTimeSlots not implemented yet");
  }

  // Availability exceptions operations
  static async loadExceptionsForDateRange(startDate: string, endDate: string) {
    const response = await fetch(
      `/api/availability/days?startDate=${startDate}&endDate=${endDate}`
    );
    if (!response.ok) {
      throw new Error("Failed to load exceptions for date range");
    }
    const data = await response.json();
    return data.exceptions || [];
  }

  static async loadAllExceptions() {
    // This would need a separate API endpoint
    console.log("loadAllExceptions not implemented yet");
    return [];
  }

  static async loadExceptionForDate(date: string) {
    const response = await fetch(
      `/api/availability/days?startDate=${date}&endDate=${date}`
    );
    if (!response.ok) {
      throw new Error("Failed to load exception for date");
    }
    const data = await response.json();
    return data.exceptions?.[0] || null;
  }

  static async saveException(
    exception: Omit<AvailabilityException, "user_id">
  ) {
    const response = await fetch("/api/availability/exceptions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        date: exception.date,
        isAvailable: exception.is_available,
        reason: exception.reason,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to save exception");
    }
  }

  static async deleteAllExceptions() {
    // This would need a separate API endpoint
    console.log("deleteAllExceptions not implemented yet");
  }
}
