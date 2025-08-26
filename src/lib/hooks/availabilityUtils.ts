import { TimeSlotUtils } from "../utils/timeSlotUtils";
import type {
  TimeSlot,
  DayAvailability,
  WorkingHours,
  AvailabilitySettings,
} from "../types/availability";

// Process multiple days with batched data
export function processMultipleDays(
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

// Helper function to get user ID from server
export async function getUserIdFromServer(): Promise<string | undefined> {
  try {
    const response = await fetch("/api/auth/user-id");
    if (response.ok) {
      const data = await response.json();
      return data.userId;
    }
  } catch (error) {
    console.warn("Could not get user ID for slot generation:", error);
  }
  return undefined;
}
