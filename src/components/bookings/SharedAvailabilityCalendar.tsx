"use client";

import { useState, useEffect } from "react";
import { format, addDays, startOfDay, isBefore } from "date-fns";
import { CalendarDaysIcon, ClockIcon } from "@heroicons/react/24/outline";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked?: boolean;
}

interface DayAvailability {
  date: Date;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

interface SharedAvailabilityCalendarProps {
  userId: string;
  onDateSelect: (date: Date) => void;
  onTimeSlotSelect: (slot: TimeSlot) => void;
  selectedDate: Date | null;
  selectedTimeSlot: TimeSlot | null;
  dayAvailability: DayAvailability | null;
  isLoading: boolean;
  fetchDayAvailability: (date: Date) => Promise<void>;
}

export default function SharedAvailabilityCalendar({
  userId,
  onDateSelect,
  onTimeSlotSelect,
  selectedDate,
  selectedTimeSlot,
  dayAvailability,
  isLoading,
  fetchDayAvailability,
}: SharedAvailabilityCalendarProps) {
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  // Generate available dates (next 30 days)
  useEffect(() => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());

    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      dates.push(date);
    }

    setAvailableDates(dates);
  }, []);

  const handleDateSelect = (date: Date) => {
    onDateSelect(date);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.isAvailable && !slot.isBooked) {
      onTimeSlotSelect(slot);
    }
  };

  const isDateDisabled = (date: Date) => {
    return isBefore(date, startOfDay(new Date()));
  };

  const getAvailableSlots = () => {
    if (!dayAvailability) return [];
    return dayAvailability.timeSlots.filter(
      (slot) => slot.isAvailable && !slot.isBooked
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
          Select Date
        </h3>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {availableDates.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => handleDateSelect(date)}
              disabled={isDateDisabled(date)}
              className={`
                p-3 text-sm font-medium rounded-lg transition-all
                ${
                  selectedDate &&
                  format(selectedDate, "yyyy-MM-dd") ===
                    format(date, "yyyy-MM-dd")
                    ? "bg-blue-600 text-white shadow-lg"
                    : isDateDisabled(date)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-200 border border-gray-200"
                }
              `}
            >
              <div className="text-xs text-gray-500 mb-1">
                {format(date, "EEE")}
              </div>
              <div className="text-lg">{format(date, "d")}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slot Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-green-600" />
            Available Time Slots for{" "}
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading availability...</p>
            </div>
          ) : dayAvailability && dayAvailability.isWorkingDay ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {getAvailableSlots().map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleTimeSlotSelect(slot)}
                  className={`
                    p-3 text-sm font-medium rounded-lg border transition-all
                    ${
                      selectedTimeSlot?.id === slot.id
                        ? "bg-green-600 text-white border-green-600 shadow-lg"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-green-50 hover:border-green-200"
                    }
                  `}
                >
                  <div className="font-semibold">{slot.startTime}</div>
                  <div className="text-xs text-gray-500">to {slot.endTime}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>No working hours set for this day.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
