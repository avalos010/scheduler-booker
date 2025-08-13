"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
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
  isBefore,
  startOfDay,
} from "date-fns";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PauseIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useAvailability } from "@/lib/hooks/useAvailabilityNew";
import type { TimeSlot } from "@/lib/types/availability";
import DayDetailsModal from "./DayDetailsModal";

export default function AvailabilityCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const {
    availability,
    workingHours,
    settings,
    isFullyLoaded,
    toggleWorkingDay,
    toggleTimeSlot,
    regenerateDaySlots,
    setAvailability,
    resetCalendarToDefaults,
    loadAvailability,
    loadTimeSlotsForMonth,
    processMonthDays,
    markTimeSlotsLoaded,
  } = useAvailability();

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Track if we've already processed the current month
  const processedMonthRef = useRef<string>("");
  const timeSlotsMarkedRef = useRef<boolean>(false);

  // Main calendar processing effect - handles month changes and working hours updates
  useEffect(() => {
    console.log("📅 Calendar effect triggered:", {
      workingHoursLength: workingHours.length,
      currentMonth: currentMonth.toISOString(),
      isFullyLoaded,
      availabilityKeys: Object.keys(availability).length,
      timestamp: new Date().toISOString(),
    });

    // Only process if working hours are loaded AND data is fully loaded
    if (workingHours.length === 0 || !isFullyLoaded) {
      console.log("⏳ Waiting for data to be fully loaded:", {
        workingHoursLength: workingHours.length,
        isFullyLoaded,
      });
      return;
    }

    const monthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;

    // Skip if month already processed
    if (processedMonthRef.current === monthKey) {
      console.log("✅ Month already processed, skipping");
      return;
    }

    console.log("🔄 Processing new month, resetting flags");
    // Reset flags for new month
    timeSlotsMarkedRef.current = false;
    processedMonthRef.current = monthKey;

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    // Generate time slots for each day in the month
    const days: Date[] = [];
    for (let i = 0; i < 31; i++) {
      const day = new Date(monthStart);
      day.setDate(monthStart.getDate() + i);
      if (day > monthEnd) break;
      days.push(new Date(day));
    }

    // Optimized: Process days in batch
    const processDaysOptimized = async () => {
      const processMonthStart = startOfMonth(currentMonth);
      const processMonthEnd = endOfMonth(currentMonth);

      // Load all month data in 2 queries instead of N queries per day
      const monthData = await loadTimeSlotsForMonth(
        processMonthStart,
        processMonthEnd
      );

      if (monthData) {
        // Process all days with the batched data (no more database calls)
        await processMonthDays(
          days,
          monthData.exceptionsMap,
          monthData.slotsMap
        );
      }

      // Mark time slots as loaded after processing all days
      if (!timeSlotsMarkedRef.current) {
        setTimeout(() => {
          markTimeSlotsLoaded();
          timeSlotsMarkedRef.current = true;
        }, 50); // Reduced timeout since we're faster now
      }
    };

    processDaysOptimized();
  }, [
    currentMonth,
    workingHours,
    loadTimeSlotsForMonth,
    processMonthDays,
    markTimeSlotsLoaded,
  ]);

  // Reset processed month when data changes (so calendar reprocesses with new data)
  useEffect(() => {
    console.log("🔄 Data changed, resetting processed month flag");
    processedMonthRef.current = "";
    timeSlotsMarkedRef.current = false;
  }, [workingHours, settings]);

  // Function to refresh calendar data
  const refreshCalendar = useCallback(async () => {
    console.log("🔄 refreshCalendar called at:", new Date().toISOString());

    // Clear current availability to force regeneration
    setAvailability({});

    // Reset processed month flag to force regeneration
    processedMonthRef.current = "";
    timeSlotsMarkedRef.current = false;

    console.log("🔄 refreshCalendar completed, flags reset");
  }, []);

  // Note: loadDayAvailabilityExceptions is now called from the main calendar processing effect

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
            onClick={refreshCalendar}
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
            onClick={async () => {
              // Reset calendar to default working hours
              await resetCalendarToDefaults();
              // Reload everything fresh by calling loadAvailability
              await loadAvailability();
            }}
            className="px-6 py-3 text-sm font-medium text-red-700 hover:text-red-900 hover:bg-red-50 rounded-xl transition-all duration-200 border border-red-300 hover:border-red-400 flex items-center space-x-2"
            title="Reset calendar to default working hours"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Reset to Defaults</span>
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
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden relative">
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
        {!isFullyLoaded ? (
          <div>
            <div className="p-8 text-center bg-gray-50 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Loading Calendar...
              </h3>
              <p className="text-gray-600">
                Please wait while we prepare your availability calendar
              </p>
            </div>
            <div className="grid grid-cols-7">
              {/* Generate skeleton days for the current month */}
              {Array.from({ length: 42 }, (_, index) => {
                const skeletonDay = new Date(currentMonth);
                skeletonDay.setDate(1);
                skeletonDay.setDate(
                  skeletonDay.getDate() + index - skeletonDay.getDay()
                );

                return (
                  <div
                    key={`skeleton-${index}`}
                    className="min-h-[160px] border-r border-b border-gray-100 bg-gray-50"
                    style={{
                      animationDelay: `${index * 0.05}s`,
                    }}
                  >
                    <div className="p-4">
                      {/* Date number skeleton */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-[shimmer_2s_ease-in-out_infinite] rounded"></div>
                        </div>
                        {/* Toggle button skeleton */}
                        <div className="w-7 h-7 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-[shimmer_2s_ease-in-out_infinite] rounded-full"></div>
                      </div>

                      {/* Content skeleton */}
                      <div className="space-y-3">
                        {/* Time slots indicator skeleton */}
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-[shimmer_2s_ease-in-out_infinite] rounded"></div>
                          <div className="w-20 h-3 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-[shimmer_2s_ease-in-out_infinite] rounded"></div>
                        </div>

                        {/* Slot dots skeleton */}
                        <div className="flex flex-wrap gap-1">
                          {Array.from({ length: 4 }, (_, i) => (
                            <div
                              key={i}
                              className="w-2 h-2 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200px_100%] animate-[shimmer_2s_ease-in-out_infinite] rounded-full"
                              style={{
                                animationDelay: `${index * 0.05 + i * 0.1}s`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateKeyLocal = format(day, "yyyy-MM-dd");
              const dateKeyIso = day.toISOString().split("T")[0];
              const prevDay = new Date(day.getTime() - 24 * 60 * 60 * 1000);
              const nextDay = new Date(day.getTime() + 24 * 60 * 60 * 1000);
              const prevKeyLocal = format(prevDay, "yyyy-MM-dd");
              const nextKeyLocal = format(nextDay, "yyyy-MM-dd");
              // Get the default working day status from working hours
              const dayOfWeek = day.getDay();
              const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const dayHours = workingHours[dayIndex];

              const dayAvailability = availability[dateKeyLocal] ||
                availability[dateKeyIso] ||
                availability[prevKeyLocal] ||
                availability[nextKeyLocal] || {
                  date: day,
                  timeSlots: [],
                  isWorkingDay: dayHours?.isWorking ?? false, // Use working hours configuration
                };
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isPastDay = isBefore(day, startOfDay(new Date()));

              // Check if past day has any booked time slots (meetings/history)
              const hasBookedSlots = dayAvailability.timeSlots.some(
                (slot: TimeSlot) => slot.isBooked
              );

              // For past days: only show if they have bookings/meetings, and don't show as available
              const shouldShowPastDay = !isPastDay || hasBookedSlots;
              const shouldShowAsAvailable =
                !isPastDay && dayAvailability.isWorkingDay;

              // Don't render past days unless they have bookings
              if (!shouldShowPastDay) {
                return (
                  <div
                    key={day.toString()}
                    className="min-h-[160px] border-r border-b border-gray-100 bg-gray-100 opacity-50"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xl font-bold text-gray-400">
                          {format(day, "d")}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={day.toString()}
                  className={`min-h-[160px] border-r border-b border-gray-100 transition-all duration-200 ${
                    !isCurrentMonth ? "text-gray-300 bg-gray-50" : ""
                  } ${
                    isSelected
                      ? "ring-2 ring-blue-500 ring-inset bg-blue-50 shadow-lg"
                      : ""
                  } ${
                    isCurrentDay
                      ? "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                      : ""
                  } ${
                    isPastDay
                      ? "bg-gray-50 cursor-default"
                      : "cursor-pointer hover:bg-blue-50 hover:shadow-md"
                  }`}
                  onClick={() => {
                    // Only allow interaction for current/future days or past days with bookings
                    if (!isPastDay || hasBookedSlots) {
                      setSelectedDate(day);
                      setShowDayModal(true);
                      // Day will be processed through optimized batch loading
                    }
                  }}
                  title={
                    isPastDay && hasBookedSlots
                      ? "Past day with meeting history - Click to view"
                      : isPastDay
                      ? "Past day - No meetings"
                      : "Click to view and edit day details"
                  }
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
                      {!isPastDay && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            await toggleWorkingDay(day);
                          }}
                          disabled={workingHours.length === 0}
                          className={`w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            workingHours.length === 0
                              ? "opacity-50 cursor-not-allowed"
                              : "cursor-pointer"
                          } ${
                            shouldShowAsAvailable
                              ? "bg-green-500 border-green-500 shadow-md hover:shadow-lg hover:bg-green-600"
                              : "bg-gray-300 border-gray-300 hover:bg-gray-400 hover:border-gray-400"
                          }`}
                          title={
                            workingHours.length === 0
                              ? "Loading working hours..."
                              : shouldShowAsAvailable
                              ? "Working day - Click to disable"
                              : "Non-working day - Click to enable"
                          }
                        >
                          {shouldShowAsAvailable && (
                            <CheckCircleIcon className="w-4 h-4 text-white mx-auto" />
                          )}
                        </button>
                      )}
                      {isPastDay && hasBookedSlots && (
                        <div className="w-7 h-7 rounded-full bg-blue-100 border-2 border-blue-300 flex items-center justify-center">
                          <ClockIcon className="w-4 h-4 text-blue-600" />
                        </div>
                      )}
                    </div>

                    {/* Quick availability indicator */}
                    {isPastDay && hasBookedSlots ? (
                      // Past day with meetings - show booking history
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="w-4 h-4 text-blue-500" />
                          <div className="text-xs text-gray-600 font-medium">
                            {
                              dayAvailability.timeSlots.filter(
                                (slot: TimeSlot) => slot.isBooked
                              ).length
                            }{" "}
                            past meetings
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {dayAvailability.timeSlots
                            .slice(0, 4)
                            .map((slot: TimeSlot) => (
                              <div
                                key={slot.id}
                                className={`w-2 h-2 rounded-full transition-all duration-200 ${
                                  slot.isBooked
                                    ? "bg-blue-400 shadow-sm"
                                    : "bg-gray-200"
                                }`}
                                title={`${slot.startTime} - ${slot.endTime} ${
                                  slot.isBooked ? "(Booked)" : ""
                                }`}
                              />
                            ))}
                          {dayAvailability.timeSlots.length > 4 && (
                            <div className="text-xs text-gray-400 font-medium">
                              +{dayAvailability.timeSlots.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : !isPastDay &&
                      dayAvailability.isWorkingDay &&
                      dayAvailability.timeSlots.length > 0 ? (
                      // Future/current day with available slots
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <ClockIcon className="w-4 h-4 text-green-500" />
                          <div className="text-xs text-gray-600 font-medium">
                            {
                              dayAvailability.timeSlots.filter(
                                (slot: TimeSlot) =>
                                  slot.isAvailable && !slot.isBooked
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
                                  slot.isBooked
                                    ? "bg-blue-400 shadow-sm"
                                    : slot.isAvailable
                                    ? "bg-green-400 shadow-sm"
                                    : "bg-gray-300"
                                }`}
                                title={`${slot.startTime} - ${slot.endTime} ${
                                  slot.isBooked
                                    ? "(Booked)"
                                    : slot.isAvailable
                                    ? "(Available)"
                                    : "(Unavailable)"
                                }`}
                              />
                            ))}
                          {dayAvailability.timeSlots.length > 4 && (
                            <div className="text-xs text-gray-400 font-medium">
                              +{dayAvailability.timeSlots.length - 4}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : !isPastDay && dayAvailability.isWorkingDay ? (
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <XCircleIcon className="w-4 h-4" />
                        <span>No slots configured</span>
                      </div>
                    ) : !isPastDay ? (
                      <div className="flex items-center space-x-2 text-xs text-gray-400">
                        <PauseIcon className="w-4 h-4" />
                        <span>Non-working day</span>
                      </div>
                    ) : null}
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
        availability={availability}
        workingHours={workingHours}
        toggleTimeSlot={toggleTimeSlot}
        toggleWorkingDay={toggleWorkingDay}
        regenerateDaySlots={regenerateDaySlots}
      />
    </div>
  );
}
