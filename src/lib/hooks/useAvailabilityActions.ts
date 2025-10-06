import { useCallback } from "react";
import { startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { TimeSlotUtils } from "../utils/timeSlotUtils";
import { ClientAvailabilityService } from "../services/clientAvailabilityService";

import type {
  TimeSlot,
  DayAvailability,
  WorkingHours,
  AvailabilitySettings,
} from "../types/availability";

interface UseAvailabilityActionsProps {
  availability: Record<string, DayAvailability>;
  workingHours: WorkingHours[];
  settings: AvailabilitySettings;
  updateDayAvailability: (
    date: Date,
    updates: Partial<DayAvailability>
  ) => void;
  loadTimeSlotsForMonth: (
    startDate: Date,
    endDate: Date
  ) => Promise<{
    exceptionsMap: Map<string, { is_available: boolean; reason?: string }>;
    slotsMap: Map<string, TimeSlot[]>;
  }>;
  processMonthDays: (
    days: Date[],
    exceptionsMap: Map<string, { is_available: boolean; reason?: string }>,
    slotsMap: Map<string, TimeSlot[]>
  ) => Promise<void>;
}

export function useAvailabilityActions({
  availability,
  workingHours,
  settings,
  updateDayAvailability,
  loadTimeSlotsForMonth,
  processMonthDays,
}: UseAvailabilityActionsProps) {
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
              settings.slotDuration,
              undefined, // userId - no longer needed for client-side generation
              dateKey
            );
          } else {
            newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
              "09:00",
              "17:00",
              settings.slotDuration,
              undefined, // userId - no longer needed for client-side generation
              dateKey
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
              settings.slotDuration,
              undefined, // userId - no longer needed for client-side generation
              dateKey
            );
          } else {
            newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
              "09:00",
              "17:00",
              settings.slotDuration,
              undefined, // userId - no longer needed for client-side generation
              dateKey
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
                settings.slotDuration,
                undefined, // userId - no longer needed for client-side generation
                dateKey
              );
            } else {
              newTimeSlots = TimeSlotUtils.generateDefaultTimeSlots(
                "09:00",
                "17:00",
                settings.slotDuration,
                undefined, // userId - no longer needed for client-side generation
                dateKey
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
    async (
      date: Date,
      slot: {
        id: string;
        startTime: string;
        endTime: string;
        isAvailable: boolean;
      }
    ) => {
      console.log("🔄 toggleTimeSlot called:", { date, slot });

      const dateKey = TimeSlotUtils.formatDateKey(date);
      const currentDay = availability[dateKey];

      console.log("🔍 Current day data:", { dateKey, currentDay });

      // Update local state if we have it
      if (currentDay) {
        const updatedSlots = currentDay.timeSlots.map((existingSlot) =>
          existingSlot.id === slot.id
            ? { ...existingSlot, isAvailable: !slot.isAvailable }
            : existingSlot
        );

        console.log("📝 Updated slots:", { updatedSlots });

        // Update local state
        updateDayAvailability(date, { timeSlots: updatedSlots });
      }

      // Save to database via API
      try {
        const newAvailability = !slot.isAvailable;

        const formattedDate = TimeSlotUtils.formatDateKey(date);
        console.log("💾 Saving slot to database:", {
          date: formattedDate,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_available: newAvailability,
        });
        console.log("💾 Raw values:", {
          rawDate: date,
          formattedDate,
          slotStartTime: slot.startTime,
          slotEndTime: slot.endTime,
          slotStartTimeType: typeof slot.startTime,
          slotEndTimeType: typeof slot.endTime,
          fullSlot: slot,
        });

        await ClientAvailabilityService.updateTimeSlot({
          date: TimeSlotUtils.formatDateKey(date),
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_available: newAvailability,
        });
        console.log("✅ Slot saved successfully");
      } catch (error) {
        console.error("❌ Failed to update time slot:", error);
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

      const dateKey = TimeSlotUtils.formatDateKey(date);
      const newSlots = TimeSlotUtils.generateDefaultTimeSlots(
        startTime,
        endTime,
        slotDuration,
        0, // breakDuration
        undefined, // userId - no longer needed for client-side generation
        dateKey
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

          // Reload the month data to get the new consistent IDs from the database
          const startDate = startOfMonth(date);
          const endDate = endOfMonth(date);
          console.log("🔄 Reloading month data to get new slot IDs...");

          const monthData = await loadTimeSlotsForMonth(startDate, endDate);
          if (monthData) {
            // Get all days in the current month
            const monthDays = eachDayOfInterval({
              start: startDate,
              end: endDate,
            });

            // Reprocess all days with the updated data
            await processMonthDays(
              monthDays,
              monthData.exceptionsMap,
              monthData.slotsMap
            );
            console.log("✅ Availability data reloaded with new slot IDs");
          }
        } else {
          console.warn("⚠️ No slots generated, nothing to save");
        }

        return { success: true };
      } catch (error) {
        console.error("❌ Failed to save regenerated slots:", error);
        return { success: false, error };
      }
    },
    [updateDayAvailability, loadTimeSlotsForMonth, processMonthDays]
  );

  return {
    toggleWorkingDay,
    toggleTimeSlot,
    regenerateDaySlots,
  };
}
