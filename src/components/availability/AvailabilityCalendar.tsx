"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from "date-fns";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { useAvailability, type TimeSlot } from "@/lib/hooks/useAvailability";
import DayDetailsModal from "./DayDetailsModal";

export default function AvailabilityCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const {
    availability,
    workingHours,
    toggleWorkingDay,
    generateTimeSlotsForDate,
    loadTimeSlotsForDate,
    setAvailability,
  } = useAvailability();

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Generate time slots for the current month when component first mounts
  useEffect(() => {
    // Only generate time slots if working hours are loaded
    if (workingHours.length === 0) {
      return;
    }

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Generate time slots for each day in the month
    const days = [];
    for (let i = 0; i < 31; i++) {
      const day = new Date(monthStart);
      day.setDate(monthStart.getDate() + i);
      if (day > monthEnd) break;
      days.push(new Date(day));
    }

    for (const day of days) {
      const dateKey = day.toISOString().split("T")[0];
      const dayOfWeek = day.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = workingHours[dayIndex];

      // Only generate if we don't already have data for this day and it's a working day
      if (!availability[dateKey] && dayHours && dayHours.isWorking) {
        generateTimeSlotsForDate(day);
      } else if (!availability[dateKey]) {
        // Mark as non-working day
        setAvailability((prev) => ({
          ...prev,
          [dateKey]: {
            date: day,
            timeSlots: [],
            isWorkingDay: false,
          },
        }));
      }
    }
  }, [currentMonth, generateTimeSlotsForDate, availability, workingHours]);

  // Function to refresh calendar data
  const refreshCalendar = useCallback(async () => {
    // Clear current availability to force regeneration
    setAvailability({});

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Regenerate time slots for the current month
    const days = [];
    for (let i = 0; i < 31; i++) {
      const day = new Date(monthStart);
      day.setDate(monthStart.getDate() + i);
      if (day > monthEnd) break;
      days.push(new Date(day));
    }

    for (const day of days) {
      const dateKey = day.toISOString().split("T")[0];
      const dayOfWeek = day.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = workingHours[dayIndex];

      if (dayHours && dayHours.isWorking) {
        await generateTimeSlotsForDate(day);
      }
    }
  }, [currentMonth, generateTimeSlotsForDate, workingHours]);

  // Set loading to false when working hours are loaded
  useEffect(() => {
    if (workingHours.length > 0) {
      setIsLoading(false);
    }
  }, [workingHours]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(
      direction === "prev"
        ? subMonths(currentMonth, 1)
        : addMonths(currentMonth, 1)
    );
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <h3 className="text-xl font-bold text-gray-900">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors border border-gray-300"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth("next")}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-3 text-center text-sm font-semibold text-gray-700 uppercase tracking-wide"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        {isLoading ? (
          <div className="col-span-7 p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading calendar...</p>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateKey = day.toISOString().split("T")[0];
              const dayAvailability = availability[dateKey] || {
                date: day,
                timeSlots: [],
                isWorkingDay: false,
              };
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);

              return (
                <div
                  key={day.toString()}
                  className={`min-h-[140px] border-r border-b border-gray-100 cursor-pointer transition-all hover:bg-gray-50 ${
                    !isCurrentMonth ? "text-gray-300 bg-gray-50" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-blue-500 ring-inset bg-blue-50"
                      : ""
                  } ${isCurrentDay ? "bg-blue-50 border-blue-200" : ""}`}
                  onClick={() => {
                    setSelectedDate(day);
                    setShowDayModal(true);
                    // Load or generate time slots for this day
                    loadTimeSlotsForDate(day);
                  }}
                >
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-lg font-semibold ${
                          isCurrentDay ? "text-blue-600" : "text-gray-900"
                        }`}
                      >
                        {format(day, "d")}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWorkingDay(day);
                        }}
                        className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${
                          dayAvailability.isWorkingDay
                            ? "bg-green-500 border-green-500 shadow-sm"
                            : "bg-gray-300 border-gray-300"
                        }`}
                        title={
                          dayAvailability.isWorkingDay
                            ? "Working day"
                            : "Non-working day"
                        }
                      />
                    </div>

                    {/* Quick availability indicator */}
                    {dayAvailability.isWorkingDay &&
                    dayAvailability.timeSlots.length > 0 ? (
                      <div className="space-y-1">
                        <div className="text-xs text-gray-500 font-medium">
                          {
                            dayAvailability.timeSlots.filter(
                              (slot: TimeSlot) => slot.isAvailable
                            ).length
                          }{" "}
                          slots available
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dayAvailability.timeSlots
                            .slice(0, 3)
                            .map((slot: TimeSlot) => (
                              <div
                                key={slot.id}
                                className={`w-2 h-2 rounded-full ${
                                  slot.isAvailable
                                    ? "bg-green-400"
                                    : "bg-gray-300"
                                }`}
                                title={`${slot.startTime} - ${slot.endTime}`}
                              />
                            ))}
                          {dayAvailability.timeSlots.length > 3 && (
                            <div className="text-xs text-gray-400">
                              +{dayAvailability.timeSlots.length - 3}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : dayAvailability.isWorkingDay ? (
                      <div className="text-xs text-gray-400 text-center">
                        No slots configured
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 text-center">
                        Non-working day
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Day Details Modal */}
      <DayDetailsModal
        isOpen={showDayModal}
        onClose={() => setShowDayModal(false)}
        selectedDate={selectedDate}
      />
    </div>
  );
}
