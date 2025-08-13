"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { XMarkIcon } from "@heroicons/react/24/outline";
import TimePicker from "./TimePicker";
import type { DayAvailability, WorkingHours } from "@/lib/types/availability";

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  availability: Record<string, DayAvailability>;
  workingHours: WorkingHours[];
  toggleTimeSlot: (date: Date, slotId: string) => Promise<void> | void;
  toggleWorkingDay: (date: Date) => Promise<void> | void;
  regenerateDaySlots: (
    date: Date,
    startTime: string,
    endTime: string,
    slotDuration: number
  ) => Promise<{ success: boolean; error?: unknown }> | { success: boolean };
}

export default function DayDetailsModal({
  isOpen,
  onClose,
  selectedDate,
  availability,
  workingHours,
  toggleTimeSlot,
  toggleWorkingDay,
  regenerateDaySlots,
}: DayDetailsModalProps) {
  const [customStart, setCustomStart] = useState<string>("09:00");
  const [customEnd, setCustomEnd] = useState<string>("17:00");
  const [customDuration, setCustomDuration] = useState<number>(60);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Initialize custom controls from defaults when selection changes
  useEffect(() => {
    if (!selectedDate) return;
    const dayOfWeek = selectedDate.getDay();
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const dayHours = workingHours[dayIndex];
    if (dayHours) {
      setCustomStart(dayHours.startTime || "09:00");
      setCustomEnd(dayHours.endTime || "17:00");
    }
  }, [selectedDate, workingHours]);

  if (!isOpen || !selectedDate) return null;

  const dateKeyLocal = format(selectedDate, "yyyy-MM-dd");
  const dateKeyIso = selectedDate.toISOString().split("T")[0];

  // Get the default working day status from working hours
  const dayOfWeek = selectedDate.getDay();
  const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const dayHours = workingHours[dayIndex];
  const defaultIsWorking = dayHours?.isWorking ?? false;

  const dayAvailability = availability[dateKeyLocal] ||
    availability[dateKeyIso] || {
      date: selectedDate,
      timeSlots: [],
      isWorkingDay: defaultIsWorking,
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-3xl h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h2>
            <p className="text-gray-600 mt-1 text-sm">
              Manage your availability for this day
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Dismiss"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4">
          <div className="space-y-6">
            {/* Working Day Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  Working Day
                </h3>
                <p className="text-sm text-gray-600">
                  {dayAvailability.isWorkingDay
                    ? "This day is marked as a working day"
                    : "This day is marked as non-working"}
                </p>
              </div>
              <button
                onClick={() => toggleWorkingDay(selectedDate)}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
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

            {/* Time Slots */}
            {dayAvailability.isWorkingDay ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <h3 className="text-lg font-medium text-gray-800">
                    Time Slots
                  </h3>
                  <span className="ml-2 text-sm text-gray-500">
                    {
                      dayAvailability.timeSlots.filter(
                        (s) => s.isAvailable && !s.isBooked
                      ).length
                    }
                    /{dayAvailability.timeSlots.length} available
                  </span>
                </div>

                {/* Custom schedule controls */}
                <div className="flex flex-wrap items-center gap-3 rounded-lg bg-gray-50 p-3 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">From</span>
                    <TimePicker value={customStart} onChange={setCustomStart} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">to</span>
                    <TimePicker value={customEnd} onChange={setCustomEnd} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Duration</span>
                    <select
                      value={customDuration}
                      onChange={(e) =>
                        setCustomDuration(Number(e.target.value))
                      }
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
                    >
                      <option value={15}>15m</option>
                      <option value={30}>30m</option>
                      <option value={45}>45m</option>
                      <option value={60}>60m</option>
                      <option value={90}>90m</option>
                      <option value={120}>120m</option>
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      setIsRegenerating(true);
                      await regenerateDaySlots(
                        selectedDate,
                        customStart,
                        customEnd,
                        customDuration
                      );
                      setIsRegenerating(false);
                    }}
                    className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
                    disabled={isRegenerating}
                  >
                    {isRegenerating ? "Regenerating..." : "Regenerate slots"}
                  </button>
                </div>

                {dayAvailability.timeSlots.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 p-2 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {dayAvailability.timeSlots.map((slot) => (
                        <button
                          key={slot.id}
                          onClick={async () =>
                            await toggleTimeSlot(selectedDate, slot.id)
                          }
                          className={`flex items-center justify-between px-3 py-2 text-sm rounded-md border transition-colors ${
                            slot.isAvailable
                              ? "bg-green-50 border-green-200 text-green-800 hover:bg-green-100"
                              : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
                          }`}
                          title={
                            slot.isAvailable
                              ? "Mark unavailable"
                              : "Mark available"
                          }
                        >
                          <span className="font-medium">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span
                            className={`ml-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              slot.isAvailable
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-200 text-gray-700"
                            }`}
                          >
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                slot.isAvailable
                                  ? "bg-green-600"
                                  : "bg-gray-500"
                              }`}
                            />
                            {slot.isAvailable ? "Available" : "Unavailable"}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No time slots configured for this day.</p>
                    <p className="text-sm mt-1">
                      Configure your default working hours in settings to
                      generate time slots.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>This day is not marked as a working day.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-white/95 backdrop-blur">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
