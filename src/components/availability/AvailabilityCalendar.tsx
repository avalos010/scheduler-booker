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
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon,
  SunIcon,
  MoonIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
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
    loadDayAvailabilityExceptions,
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
      // Load day availability exceptions after working hours are loaded
      loadDayAvailabilityExceptions();
    }
  }, [workingHours, loadDayAvailabilityExceptions]);

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
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
            <CalendarDaysIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">
              {format(currentMonth, "MMMM yyyy")}
            </h3>
            <p className="text-sm text-gray-500">Manage your availability</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigateMonth("prev")}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-gray-300 hover:border-gray-400 flex items-center space-x-2"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Today</span>
          </button>
          <button
            onClick={async () => {
              setIsLoading(true);
              await loadDayAvailabilityExceptions();
              setIsLoading(false);
            }}
            className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-gray-300 hover:border-gray-400 flex items-center space-x-2"
            title="Refresh calendar data"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </button>
          <button
            onClick={() => navigateMonth("next")}
            className="p-3 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Day headers */}
        <div className="grid grid-cols-7 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="p-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        {isLoading ? (
          <div className="col-span-7 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">
              Loading your calendar...
            </p>
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
                  className={`min-h-[160px] border-r border-b border-gray-100 cursor-pointer transition-all duration-200 hover:bg-blue-50 hover:shadow-md ${
                    !isCurrentMonth ? "text-gray-300 bg-gray-50" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-blue-500 ring-inset bg-blue-50 shadow-lg"
                      : ""
                  } ${
                    isCurrentDay
                      ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                      : ""
                  }`}
                  onClick={() => {
                    // Set as selected date and open modal
                    setSelectedDate(day);
                    setShowDayModal(true);
                    // Load or generate time slots for this day
                    loadTimeSlotsForDate(day);
                  }}
                  title={`Click to view and edit day details`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-xl font-bold ${
                            isCurrentDay ? "text-blue-600" : "text-gray-900"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {isCurrentDay && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          console.log(
                            "Toggle button clicked for date:",
                            day.toISOString().split("T")[0]
                          );
                          console.log(
                            "Current working day status:",
                            dayAvailability.isWorkingDay
                          );
                          console.log("Calling toggleWorkingDay function...");
                          await toggleWorkingDay(day);
                          console.log("toggleWorkingDay function called");
                        }}
                        className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 cursor-pointer ${
                          dayAvailability.isWorkingDay
                            ? "bg-green-500 border-green-500 shadow-md hover:shadow-lg hover:bg-green-600"
                            : "bg-gray-300 border-gray-300 hover:bg-gray-400 hover:border-gray-400"
                        }`}
                        title={
                          dayAvailability.isWorkingDay
                            ? "Working day - Click to disable"
                            : "Non-working day - Click to enable"
                        }
                      >
                        {dayAvailability.isWorkingDay && (
                          <CheckCircleIcon className="w-4 h-4 text-white mx-auto" />
                        )}
                      </button>
                    </div>

                    {/* Quick availability indicator */}
                    {dayAvailability.isWorkingDay &&
                    dayAvailability.timeSlots.length > 0 ? (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="w-4 h-4 text-green-500" />
                          <div className="text-xs text-gray-600 font-medium">
                            {
                              dayAvailability.timeSlots.filter(
                                (slot: TimeSlot) => slot.isAvailable
                              ).length
                            }{" "}
                            slots available
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dayAvailability.timeSlots
                            .slice(0, 4)
                            .map((slot: TimeSlot) => (
                              <div
                                key={slot.id}
                                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                  slot.isAvailable
                                    ? "bg-green-400 shadow-sm"
                                    : "bg-gray-300"
                                }`}
                                title={`${slot.startTime} - ${slot.endTime}`}
                              />
                            ))}
                          {dayAvailability.timeSlots.length > 4 && (
                            <div className="text-xs text-gray-400 font-medium">
                              +{dayAvailability.timeSlots.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : dayAvailability.isWorkingDay ? (
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <XCircleIcon className="w-4 h-4" />
                        <span>No slots configured</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <PauseIcon className="w-4 h-4" />
                        <span>Non-working day</span>
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
