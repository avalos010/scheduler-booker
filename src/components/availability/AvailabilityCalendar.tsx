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
import type {
  TimeSlot,
  WorkingHours,
  AvailabilitySettings,
  DayAvailability,
} from "@/lib/types/availability";
import DayDetailsModal from "./DayDetailsModal";

interface AvailabilityCalendarProps {
  initialWorkingHours: WorkingHours[];
  initialSettings: AvailabilitySettings;
  initialAvailability: Record<string, DayAvailability>;
  userId: string;
}

export default function AvailabilityCalendar({
  initialWorkingHours,
  initialSettings,
  initialAvailability,
  userId,
}: AvailabilityCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDayModal, setShowDayModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Use the server-side data
  const [workingHours, setWorkingHours] = useState(initialWorkingHours);
  const [settings, setSettings] = useState(initialSettings);
  const [availability, setAvailability] = useState(initialAvailability);
  const [isFullyLoaded, setIsFullyLoaded] = useState(true);

  console.log("🔍 AvailabilityCalendar: Received props:", {
    initialWorkingHoursLength: initialWorkingHours?.length,
    initialSettings: initialSettings,
    initialAvailabilityKeys: Object.keys(initialAvailability || {}).length,
    userId: userId,
  });

  console.log("🔍 AvailabilityCalendar: State after initialization:", {
    workingHoursLength: workingHours?.length,
    settings: settings,
    availabilityKeys: Object.keys(availability || {}).length,
    isFullyLoaded: isFullyLoaded,
  });

  // Implement working day toggle
  const toggleWorkingDay = useCallback(
    async (date: Date) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const currentDay = availability[dateKey];

      if (currentDay) {
        const newIsWorking = !currentDay.isWorkingDay;
        let newTimeSlots = currentDay.timeSlots;

        // If making it a working day, generate default time slots
        if (newIsWorking && currentDay.timeSlots.length === 0) {
          const dayOfWeek = date.getDay();
          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const dayHours = workingHours[dayIndex];

          if (dayHours?.isWorking) {
            // Generate default slots based on working hours
            const slots: TimeSlot[] = [];
            let currentTime = new Date(`2000-01-01T${dayHours.startTime}`);
            const endTime = new Date(`2000-01-01T${dayHours.endTime}`);

            while (currentTime < endTime) {
              const slotStart = format(currentTime, "HH:mm");
              const slotEnd = format(
                new Date(currentTime.getTime() + settings.slotDuration * 60000),
                "HH:mm"
              );

              if (new Date(`2000-01-01T${slotEnd}`) <= endTime) {
                slots.push({
                  id: `${dateKey}-${slotStart}-${slotEnd}`,
                  startTime: slotStart,
                  endTime: slotEnd,
                  isAvailable: true,
                  isBooked: false,
                });
              }

              currentTime = new Date(
                currentTime.getTime() +
                  (settings.slotDuration + settings.breakDuration) * 60000
              );
            }
            newTimeSlots = slots;
          }
        }

        // Update local state
        setAvailability((prev) => ({
          ...prev,
          [dateKey]: {
            ...currentDay,
            isWorkingDay: newIsWorking,
            timeSlots: newTimeSlots,
          },
        }));

        // Save to database via API
        try {
          // Save availability exception
          await fetch("/api/availability/exceptions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date: dateKey,
              is_available: newIsWorking,
              reason: newIsWorking
                ? "Working day override"
                : "Non-working day override",
            }),
          });

          // Save time slots if it's a working day
          if (newIsWorking && newTimeSlots.length > 0) {
            await fetch("/api/availability/time-slots", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: dateKey,
                timeSlots: newTimeSlots,
              }),
            });
          }
        } catch (error) {
          console.error("Failed to save day exception:", error);
        }
      }
    },
    [availability, workingHours, settings, userId]
  );

  // Implement time slot toggle
  const toggleTimeSlot = useCallback(
    async (date: Date, slotId: string) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const currentDay = availability[dateKey];

      if (currentDay) {
        const updatedSlots = currentDay.timeSlots.map((slot) =>
          slot.id === slotId
            ? { ...slot, isAvailable: !slot.isAvailable }
            : slot
        );

        // Update local state
        setAvailability((prev) => ({
          ...prev,
          [dateKey]: {
            ...currentDay,
            timeSlots: updatedSlots,
          },
        }));

        // Save to database via API
        try {
          const slotToUpdate = updatedSlots.find((slot) => slot.id === slotId);
          if (slotToUpdate) {
            await fetch("/api/availability/time-slots", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: dateKey,
                start_time: slotToUpdate.startTime,
                end_time: slotToUpdate.endTime,
                is_available: slotToUpdate.isAvailable,
              }),
            });
          }
        } catch (error) {
          console.error("Failed to update time slot:", error);
        }
      }
    },
    [availability, userId]
  );

  // Implement regenerate day slots
  const regenerateDaySlots = useCallback(
    async (
      date: Date,
      startTime: string,
      endTime: string,
      slotDuration: number
    ) => {
      const dateKey = format(date, "yyyy-MM-dd");
      const dayOfWeek = date.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = workingHours[dayIndex];

      if (!dayHours?.isWorking) {
        return Promise.resolve({
          success: false,
          error: "Day is not a working day",
        });
      }

      try {
        console.log("🔍 Regenerating slots for date:", dateKey, {
          startTime,
          endTime,
          slotDuration,
          breakDuration: settings.breakDuration,
        });

        // Generate new time slots
        const slots: TimeSlot[] = [];
        let currentTime = new Date(`2000-01-01T${startTime}`);
        const endTimeDate = new Date(`2000-01-01T${endTime}`);

        while (currentTime < endTimeDate) {
          const slotStart = format(currentTime, "HH:mm");
          const slotEnd = format(
            new Date(currentTime.getTime() + slotDuration * 60000),
            "HH:mm"
          );

          // Only add slot if it fits within working hours
          if (new Date(`2000-01-01T${slotEnd}`) <= endTimeDate) {
            slots.push({
              id: `${dateKey}-${slotStart}-${slotEnd}`,
              startTime: slotStart,
              endTime: slotEnd,
              isAvailable: true,
              isBooked: false,
            });
          }

          // Move to next slot (including break duration)
          currentTime = new Date(
            currentTime.getTime() +
              (slotDuration + settings.breakDuration) * 60000
          );
        }

        console.log("🔍 Generated slots:", {
          dateKey,
          slotCount: slots.length,
          slots: slots.slice(0, 3), // Log first 3 slots
        });

        // Save the new time slots to the database
        console.log("🔍 Saving slots to database...");
        const response = await fetch("/api/availability/time-slots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: dateKey,
            timeSlots: slots,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save time slots");
        }

        const responseData = await response.json();
        console.log("🔍 Database save response:", responseData);

        // Update the local availability state immediately
        setAvailability((prev) => {
          const newState = {
            ...prev,
            [dateKey]: {
              date: date,
              timeSlots: slots,
              isWorkingDay: true,
            },
          };
          console.log("🔍 Updated local availability state:", {
            dateKey,
            newSlotCount: slots.length,
            totalDays: Object.keys(newState).length,
          });
          return newState;
        });

        console.log(
          "🔍 Regenerated and saved slots for:",
          dateKey,
          "with",
          slots.length,
          "slots"
        );

        return Promise.resolve({ success: true });
      } catch (error) {
        console.error("🔍 Error regenerating slots:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred";
        return Promise.resolve({ success: false, error: errorMessage });
      }
    },
    [workingHours, settings, userId]
  );

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Generate time slots for the current month based on working hours and settings
  useEffect(() => {
    if (!workingHours || workingHours.length === 0 || !settings) {
      return;
    }

    // Only run this effect if we don't have any availability data yet
    // This prevents overriding data loaded from the database
    if (Object.keys(availability).length > 0) {
      console.log(
        "🔍 AvailabilityCalendar: Skipping slot generation - data already exists"
      );
      return;
    }

    console.log("🔍 AvailabilityCalendar: Processing time slots for month:", {
      workingHoursLength: workingHours.length,
      settings: settings,
      currentMonth: currentMonth.toISOString(),
      existingAvailabilityKeys: Object.keys(availability || {}).length,
    });

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

    const newAvailability: Record<string, DayAvailability> = {};

    daysInMonth.forEach((day) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const dayOfWeek = day.getDay();
      const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const dayHours = workingHours[dayIndex];

      if (dayHours?.isWorking) {
        // Generate time slots for working days
        const slots: TimeSlot[] = [];
        let currentTime = new Date(`2000-01-01T${dayHours.startTime}`);
        const endTime = new Date(`2000-01-01T${dayHours.endTime}`);

        while (currentTime < endTime) {
          const slotStart = format(currentTime, "HH:mm");
          const slotEnd = format(
            new Date(currentTime.getTime() + settings.slotDuration * 60000),
            "HH:mm"
          );

          // Only add slot if it fits within working hours
          if (new Date(`2000-01-01T${slotEnd}`) <= endTime) {
            slots.push({
              id: `${dateKey}-${slotStart}-${slotEnd}`,
              startTime: slotStart,
              endTime: slotEnd,
              isAvailable: true,
              isBooked: false,
            });
          }

          // Move to next slot (including break duration)
          currentTime = new Date(
            currentTime.getTime() +
              (settings.slotDuration + settings.breakDuration) * 60000
          );
        }

        newAvailability[dateKey] = {
          date: day,
          timeSlots: slots,
          isWorkingDay: true,
        };

        console.log(`🔍 Generated new slots for ${dateKey}:`, slots.length);
      } else {
        // Non-working day
        newAvailability[dateKey] = {
          date: day,
          timeSlots: [],
          isWorkingDay: false,
        };
      }
    });

    console.log("🔍 AvailabilityCalendar: Generated availability for month:", {
      daysProcessed: Object.keys(newAvailability).length,
      daysWithSlots: Object.values(newAvailability).filter(
        (day) => day.timeSlots.length > 0
      ).length,
    });

    setAvailability(newAvailability);
  }, [workingHours, settings, currentMonth]); // Only run when these change, not when availability changes

  // Load availability data when month changes
  useEffect(() => {
    if (!userId || !workingHours || workingHours.length === 0 || !settings) {
      return;
    }

    console.log(
      "🔍 Month changed, loading availability data for:",
      currentMonth.toISOString()
    );

    const loadMonthData = async () => {
      try {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(currentMonth);

        // Load time slots for the month
        const startDate = format(monthStart, "yyyy-MM-dd");
        const endDate = format(monthEnd, "yyyy-MM-dd");

        console.log("🔍 Loading data for date range:", { startDate, endDate });

        const [slotsResponse, exceptionsResponse] = await Promise.all([
          fetch(
            `/api/availability/time-slots?startDate=${startDate}&endDate=${endDate}`
          ),
          fetch(
            `/api/availability/exceptions?startDate=${startDate}&endDate=${endDate}`
          ),
        ]);

        if (slotsResponse.ok && exceptionsResponse.ok) {
          const slotsData = await slotsResponse.json();
          const exceptionsData = await exceptionsResponse.json();

          console.log("🔍 Loaded month data:", {
            slotsCount: slotsData.count,
            exceptionsCount: exceptionsData.count || 0,
          });

          // Process the loaded data and update availability
          // This will be handled by the AvailabilityManager when the page loads
          // For now, we'll just log that we have the data
        }
      } catch (error) {
        console.error("🔍 Error loading month data:", error);
      }
    };

    loadMonthData();
  }, [currentMonth, userId, workingHours, settings]);

  // Simplified calendar processing - just display the data
  useEffect(() => {
    console.log("📅 Calendar data loaded:", {
      workingHoursLength: workingHours.length,
      availabilityKeys: Object.keys(availability).length,
      isFullyLoaded,
    });
  }, [workingHours, availability, isFullyLoaded]);

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
            onClick={() => {
              // TODO: Implement refresh functionality
              console.log("Refresh calendar");
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
            onClick={async () => {
              // Debug: Test database connection and data loading
              console.log("🔍 Testing database connection...");
              try {
                const response = await fetch("/api/availability/time-slots", {
                  method: "GET",
                  headers: { "Content-Type": "application/json" },
                });
                if (response.ok) {
                  const data = await response.json();
                  console.log("🔍 Database test successful:", data);
                } else {
                  console.error("🔍 Database test failed:", response.status);
                }
              } catch (error) {
                console.error("🔍 Database test error:", error);
              }
            }}
            className="px-6 py-3 text-sm font-medium text-red-700 hover:text-red-900 hover:bg-red-100 rounded-xl transition-all duration-200 border border-red-300 hover:border-red-400 flex items-center space-x-2"
            title="Test database connection"
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
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Test DB</span>
          </button>

          <button
            onClick={() => {
              setShowSettingsModal(true);
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

              // Get the default working day status from working hours
              const dayOfWeek = day.getDay();
              const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
              const dayHours = workingHours[dayIndex];

              const dayAvailability = availability[dateKeyLocal] ||
                availability[dateKeyIso] || {
                  date: day,
                  timeSlots: [],
                  isWorkingDay: dayHours?.isWorking ?? false,
                };

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
                        onClick={() => toggleWorkingDay(day)}
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
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 transition-opacity"
            onClick={() => setShowSettingsModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur">
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
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Working Hours */}
                <div>
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
                <div>
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
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> Working hours and slot settings are
                    managed on the server side. Contact your administrator to
                    make changes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
