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
} from "@heroicons/react/24/outline";
import { useAvailability } from "@/lib/hooks/useAvailabilityNew";
import type { TimeSlot } from "@/lib/types/availability";
import DayDetailsModal from "./DayDetailsModal";
import { HydrationSafeButton } from "../common/HydrationSafeElement";

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

    // Force reload data from database
    await loadAvailability();

    console.log("🔄 refreshCalendar completed, flags reset");
  }, [loadAvailability]);

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth(
      direction === "prev"
        ? subMonths(currentMonth, 1)
        : addMonths(currentMonth, 1)
    );
  };

  // Function to jump to a specific month
  const jumpToMonth = (targetMonth: Date) => {
    console.log("📅 Jumping to month:", {
      fromMonth: currentMonth.toISOString(),
      toMonth: targetMonth.toISOString(),
    });
    setCurrentMonth(targetMonth);
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
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
            title="Previous month"
          >
            <ChevronLeftIcon className="w-5 h-5" />
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
            onClick={() => {
              console.log("🔍 Debug Info:", {
                workingHours,
                settings,
                availabilityKeys: Object.keys(availability).length,
                isFullyLoaded,
                currentMonth: currentMonth.toISOString(),
                timestamp: new Date().toISOString(),
              });
            }}
            className="px-4 py-3 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-gray-200 hover:border-gray-300 flex items-center space-x-2"
            title="Debug: Show current state in console"
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
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <span>Debug</span>
          </button>

          <button
            onClick={() => {
              // TODO: Implement refresh functionality
              console.log("Refresh calendar");
            }}
            className="px-6 py-3 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all duration-200 border border-gray-300 hover:border-gray-400 flex items-center space-x-2"
            title="Settings"
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>Settings</span>
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
        {!isFullyLoaded || workingHours.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Loading Calendar...
            </h3>
            <p className="text-gray-600 mb-4">
              Please wait while we load your availability data.
            </p>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {calendarDays.map((day) => {
              const dateKeyLocal = format(day, "yyyy-MM-dd");
              const dateKeyIso = day.toISOString().split("T")[0];

              // Get the default working day status from working hours
              const dayOfWeek = day.getDay();
              const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const dayHours = workingHours[dayIndex];

              // Try multiple date key formats to find the data
              const dayAvailability = availability[dateKeyLocal] ||
                availability[dateKeyIso] ||
                availability[day.toISOString()] ||
                availability[day.toLocaleDateString()] || {
                  date: day,
                  timeSlots: [],
                  isWorkingDay: dayHours?.isWorking ?? false,
                };

              // Debug logging for each day
              if (dayAvailability.timeSlots.length > 0) {
                console.log(`📅 Day ${dateKeyLocal}:`, {
                  hasSlots: dayAvailability.timeSlots.length,
                  isWorkingDay: dayAvailability.isWorkingDay,
                  sampleSlots: dayAvailability.timeSlots.slice(0, 2),
                  dateKeyLocal,
                  dateKeyIso,
                  foundInAvailability:
                    !!availability[dateKeyLocal] || !!availability[dateKeyIso],
                  // Debug: Show what keys we tried
                  triedKeys: [
                    dateKeyLocal,
                    dateKeyIso,
                    day.toDateString(),
                    day.toLocaleDateString(),
                  ],
                  // Debug: Show if any of these keys exist in availability
                  keyExists: {
                    dateKeyLocal: !!availability[dateKeyLocal],
                    dateKeyIso: !!availability[dateKeyIso],
                    toDateString: !!availability[day.toDateString()],
                    toLocaleDateString:
                      !!availability[day.toLocaleDateString()],
                  },
                  // Debug: Show all time slots for this day
                  allTimeSlots: dayAvailability.timeSlots.map((slot) => ({
                    id: slot.id,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    isAvailable: slot.isAvailable,
                    isBooked: slot.isBooked,
                  })),
                  // Debug: Show counts
                  totalSlots: dayAvailability.timeSlots.length,
                  availableSlots: dayAvailability.timeSlots.filter(
                    (slot) => slot.isAvailable && !slot.isBooked
                  ).length,
                  bookedSlots: dayAvailability.timeSlots.filter(
                    (slot) => slot.isBooked
                  ).length,
                });
              }

              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrentDay = isToday(day);
              const isPastDay = isBefore(day, startOfDay(new Date()));

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[160px] border-r border-b border-gray-100 ${
                    isCurrentMonth ? "bg-white" : "bg-gray-50"
                  } ${
                    isSelected ? "ring-2 ring-blue-500 ring-inset" : ""
                  } transition-all duration-200 ${
                    isPastDay
                      ? "bg-gray-100 opacity-50 cursor-not-allowed"
                      : "hover:bg-gray-50 cursor-pointer"
                  }`}
                  onClick={() => {
                    if (!isPastDay) {
                      setSelectedDate(day);
                      setShowDayModal(true);
                    }
                  }}
                  title={
                    isPastDay
                      ? "Past day - no interaction available"
                      : "Click to view and edit day details"
                  }
                >
                  <div className="p-4">
                    {/* Date header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`text-sm font-medium ${
                            isCurrentMonth
                              ? isCurrentDay
                                ? "text-blue-600 font-bold"
                                : "text-gray-900"
                              : "text-gray-400"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {isCurrentDay && (
                          <span className="text-xs text-blue-600 font-medium">
                            Today
                          </span>
                        )}
                      </div>

                      {/* Working day toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent modal from opening
                          toggleWorkingDay(day);
                        }}
                        disabled={isPastDay}
                        className={`w-7 h-7 rounded-full transition-all duration-200 ${
                          isPastDay
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : dayAvailability.isWorkingDay
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                        title={
                          isPastDay
                            ? "Past days cannot be modified"
                            : dayAvailability.isWorkingDay
                            ? "Click to mark as non-working day"
                            : "Click to mark as working day"
                        }
                      >
                        {dayAvailability.isWorkingDay ? (
                          <CheckCircleIcon className="w-4 h-4 mx-auto" />
                        ) : (
                          <PauseIcon className="w-4 h-4 mx-auto" />
                        )}
                      </button>
                    </div>

                    {/* Day content */}
                    <div className="space-y-3">
                      {isPastDay ? (
                        // Past day - show meeting history but grayed out and non-interactive
                        dayAvailability.timeSlots.some(
                          (slot: TimeSlot) => slot.isBooked
                        ) ? (
                          <div className="space-y-3 opacity-50">
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
                                .filter((slot: TimeSlot) => slot.isBooked)
                                .slice(0, 4)
                                .map((slot: TimeSlot) => (
                                  <div
                                    key={slot.id}
                                    className="w-2 h-2 rounded-full bg-blue-400 shadow-sm"
                                    title={`${slot.startTime} - ${slot.endTime} (Past meeting)`}
                                  />
                                ))}
                              {dayAvailability.timeSlots.filter(
                                (slot: TimeSlot) => slot.isBooked
                              ).length > 4 && (
                                <div className="text-xs text-gray-400 font-medium">
                                  +
                                  {dayAvailability.timeSlots.filter(
                                    (slot: TimeSlot) => slot.isBooked
                                  ).length - 4}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3 opacity-50">
                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                              <PauseIcon className="w-4 h-4" />
                              <span>Past day</span>
                            </div>
                          </div>
                        )
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

      {/* Settings Modal */}
      {/* This modal is no longer needed as settings are managed by useAvailability */}
      {/* Keeping it for now as it might be re-introduced or used elsewhere */}
      {/* <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
      {/* <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowSettingsModal(false)}
          /> */}

      {/* Modal */}
      {/* <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
      {/* <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur">
              <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close settings"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
      {/* <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Working Hours */}
      {/* <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Working Hours
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {workingHours.map((hour, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-700">
                          {hour.day}
                        </span>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">
                            {hour.startTime} - {hour.endTime}
                          </span>
                          <div
                            className={`w-3 h-3 rounded-full ${
                              hour.isWorking ? "bg-green-500" : "bg-gray-400"
                            }`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Slot Settings */}
      {/* <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Slot Settings
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Slot Duration (minutes)
                      </label>
                      <div className="text-lg font-semibold text-gray-900">
                        {settings.slotDuration}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Break Duration (minutes)
                      </label>
                      <div className="text-lg font-semibold text-gray-900">
                        {settings.breakDuration}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note */}
      {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Working hours and slot settings are
                    managed on the server side. Contact your administrator to
                    make changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div> */}
    </div>
  );
}
