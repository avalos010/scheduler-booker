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
