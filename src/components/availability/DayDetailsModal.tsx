"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { XMarkIcon } from "@heroicons/react/24/outline";

import type {
  DayAvailability,
  WorkingHours,
  TimeSlot,
} from "@/lib/types/availability";

interface DayDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  availability: Record<string, DayAvailability>;
  workingHours: WorkingHours[];
  toggleTimeSlot: (
    date: Date,
    slot: {
      id: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }
  ) => Promise<void> | void;
  toggleWorkingDay: (date: Date) => Promise<void> | void;
  onCalendarRefresh?: (date: Date) => Promise<void>;
}

export default function DayDetailsModal({
  isOpen,
  onClose,
  selectedDate,
  availability,
  workingHours,
  toggleTimeSlot,
  toggleWorkingDay,
  onCalendarRefresh,
}: DayDetailsModalProps) {
  const [bookingDetails, setBookingDetails] = useState<
    Record<
      string,
      {
        clientName: string;
        clientEmail: string;
        notes?: string;
        status: string;
      }
    >
  >({});
  const [apiTimeSlots, setApiTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState<Set<string>>(new Set());

  // Function to refresh the modal data
  const refreshModalData = useCallback(async () => {
    if (!selectedDate) return;

    try {
      const response = await fetch(
        `/api/availability/day-details?date=${format(
          selectedDate,
          "yyyy-MM-dd"
        )}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.timeSlots) {
          const details: Record<
            string,
            {
              clientName: string;
              clientEmail: string;
              notes?: string;
              status: string;
            }
          > = {};

          data.timeSlots.forEach(
            (slot: {
              id: string;
              startTime: string;
              endTime: string;
              startTimeDisplay?: string;
              endTimeDisplay?: string;
              isBooked: boolean;
              bookingDetails?: {
                clientName: string;
                clientEmail: string;
                notes?: string;
                status: string;
              };
            }) => {
              if (slot.isBooked && slot.bookingDetails) {
                details[slot.id] = slot.bookingDetails;
              }
            }
          );

          setBookingDetails(details);
          setApiTimeSlots(data.timeSlots || []);
        }
      }
    } catch (error) {
      console.error("Error refreshing modal data:", error);
    }
  }, [selectedDate]);

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
      // setCustomStart(dayHours.startTime || "09:00"); // Removed
      // setCustomEnd(dayHours.endTime || "17:00"); // Removed
    }
  }, [selectedDate, workingHours]);

  // Fetch booking details when modal opens or date changes
  useEffect(() => {
    if (!isOpen || !selectedDate) {
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        const dateKey = format(selectedDate, "yyyy-MM-dd");

        // Fetch booking details for this date using the secure, authenticated endpoint
        const response = await fetch(
          `/api/availability/day-details?date=${dateKey}`
        );
        if (response.ok) {
          const data = await response.json();
          console.log("🔍 DayDetailsModal: API response:", {
            timeSlots: data.timeSlots?.slice(0, 2), // Show first 2 slots for debugging
            hasDisplayFields: data.timeSlots?.some(
              (slot: { startTimeDisplay?: string }) =>
                slot.startTimeDisplay !== undefined
            ),
            userPreference: "server-formatted",
          });
          if (data.timeSlots) {
            const details: Record<
              string,
              {
                clientName: string;
                clientEmail: string;
                notes?: string;
                status: string;
              }
            > = {};

            data.timeSlots.forEach(
              (slot: {
                id: string;
                startTime: string;
                endTime: string;
                startTimeDisplay?: string;
                endTimeDisplay?: string;
                isBooked: boolean;
                bookingDetails?: {
                  clientName: string;
                  clientEmail: string;
                  notes?: string;
                  status: string;
                };
              }) => {
                if (slot.isBooked && slot.bookingDetails) {
                  details[slot.id] = slot.bookingDetails;
                }
              }
            );

            console.log("🔍 DayDetailsModal: API data fetched:", {
              apiSlots: data.timeSlots,
              hasDisplayFields: data.timeSlots?.some(
                (slot: TimeSlot) => slot.startTimeDisplay
              ),
              mappedDetails: details,
              detailsCount: Object.keys(details).length,
              availabilitySlots: dayAvailability?.timeSlots || [],
            });
            setBookingDetails(details);
            setApiTimeSlots(data.timeSlots || []);
          }
        }
      } catch {
        // Error fetching booking details - silently fail in tests
      }
    };

    fetchBookingDetails();
  }, [isOpen, selectedDate]);

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

  // Use API time slots if available (they have formatting), otherwise fall back to prop data
  const displayTimeSlots =
    apiTimeSlots.length > 0 ? apiTimeSlots : dayAvailability.timeSlots;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 lg:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Mobile optimized */}
      <div className="relative w-full max-w-3xl h-[90vh] sm:h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header - Mobile responsive */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 truncate">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </h2>
            <p className="text-gray-600 mt-1 text-xs sm:text-sm truncate">
              Manage your availability for this day
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-2"
            aria-label="Dismiss"
          >
            <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        {/* Scrollable content area - Mobile optimized */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-3 sm:py-4">
          <div className="space-y-4 sm:space-y-6">
            {/* Working Day Toggle - Mobile responsive */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 rounded-lg space-y-3 sm:space-y-0">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Working Day
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  {dayAvailability.isWorkingDay
                    ? "This day is marked as a working day"
                    : "This day is marked as non-working"}
                </p>
              </div>
              <button
                onClick={() => toggleWorkingDay(selectedDate)}
                className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex-shrink-0 ${
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
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0"></div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-800">
                    Time Slots
                  </h3>
                  <span className="ml-2 text-xs sm:text-sm text-gray-500">
                    {
                      displayTimeSlots.filter(
                        (slotDuration) =>
                          slotDuration.isAvailable && !slotDuration.isBooked
                      ).length
                    }
                    /{displayTimeSlots.length} available
                  </span>
                </div>

                {displayTimeSlots.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 p-2 sm:p-3 bg-white">
                    {/* Two columns with expanded rows for booking details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {displayTimeSlots.map((slot) => (
                        <div key={slot.id} className="space-y-2">
                          <div className="space-y-2">
                            <button
                              onClick={async () => {
                                if (
                                  slot.isBooked ||
                                  loadingSlots.has(slot.id)
                                ) {
                                  return;
                                }

                                // Add to loading state
                                setLoadingSlots((prev) =>
                                  new Set(prev).add(slot.id)
                                );

                                try {
                                  await toggleTimeSlot(selectedDate, {
                                    id: slot.id,
                                    startTime: slot.startTime,
                                    endTime: slot.endTime,
                                    isAvailable: slot.isAvailable,
                                  });
                                  // Refresh the modal data to show updated state
                                  await refreshModalData();

                                  // Also refresh the calendar data
                                  if (onCalendarRefresh && selectedDate) {
                                    await onCalendarRefresh(selectedDate);
                                  }
                                } finally {
                                  // Remove from loading state
                                  setLoadingSlots((prev) => {
                                    const newSet = new Set(prev);
                                    newSet.delete(slot.id);
                                    return newSet;
                                  });
                                }
                              }}
                              className={`relative w-full px-3 py-2 sm:py-3 text-sm rounded-md border transition-colors flex items-center justify-center gap-2 ${
                                loadingSlots.has(slot.id)
                                  ? "bg-yellow-50 border-yellow-200 text-yellow-800 cursor-wait"
                                  : slot.isBooked
                                  ? "bg-blue-50 border-blue-200 text-blue-800 cursor-not-allowed"
                                  : slot.isAvailable
                                  ? "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 active:bg-green-200"
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                              }`}
                              title={
                                loadingSlots.has(slot.id)
                                  ? "Updating..."
                                  : slot.isBooked
                                  ? "Booked - cannot modify"
                                  : slot.isAvailable
                                  ? "Mark unavailable"
                                  : "Mark available"
                              }
                              disabled={
                                slot.isBooked || loadingSlots.has(slot.id)
                              }
                            >
                              {loadingSlots.has(slot.id) && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-yellow-600 border-t-transparent"></div>
                                </div>
                              )}
                              <div
                                className={`${
                                  loadingSlots.has(slot.id) ? "opacity-50" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium truncate">
                                    {slot.startTimeDisplay || slot.startTime} -{" "}
                                    {slot.endTimeDisplay || slot.endTime}
                                  </span>
                                  <span
                                    className={`ml-2 sm:ml-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium flex-shrink-0 ${
                                      slot.isBooked
                                        ? "bg-blue-100 text-blue-800"
                                        : slot.isAvailable
                                        ? "bg-green-100 text-green-800"
                                        : "bg-gray-200 text-gray-700"
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-1.5 w-1.5 rounded-full ${
                                        slot.isBooked
                                          ? "bg-blue-500"
                                          : slot.isAvailable
                                          ? "bg-green-600"
                                          : "bg-gray-500"
                                      }`}
                                    />
                                    <span className="hidden sm:inline">
                                      {slot.isBooked
                                        ? "Booked"
                                        : slot.isAvailable
                                        ? "Available"
                                        : "Unavailable"}
                                    </span>
                                    <span className="sm:hidden">
                                      {slot.isBooked
                                        ? "📅"
                                        : slot.isAvailable
                                        ? "✓"
                                        : "✗"}
                                    </span>
                                  </span>
                                </div>

                                {/* Show booking details inline within the same button */}
                                {slot.isBooked &&
                                  (() => {
                                    // Find booking details by time match since IDs might not match
                                    const timeBasedKey = Object.keys(
                                      bookingDetails
                                    ).find((key) =>
                                      key.includes(
                                        `${
                                          slot.startTimeDisplay ||
                                          slot.startTime
                                        }-${
                                          slot.endTimeDisplay || slot.endTime
                                        }`
                                      )
                                    );
                                    const bookingDetail =
                                      bookingDetails[slot.id] ||
                                      (timeBasedKey
                                        ? bookingDetails[timeBasedKey]
                                        : null);

                                    return !!bookingDetail;
                                  })() && (
                                    <div className="text-left space-y-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className="text-blue-600 text-xs">
                                          👤
                                        </span>
                                        <span className="text-xs font-medium text-blue-800">
                                          {(() => {
                                            const timeBasedKey = Object.keys(
                                              bookingDetails
                                            ).find((key) =>
                                              key.includes(
                                                `${
                                                  slot.startTimeDisplay ||
                                                  slot.startTime
                                                }-${
                                                  slot.endTimeDisplay ||
                                                  slot.endTime
                                                }`
                                              )
                                            );
                                            const detail =
                                              bookingDetails[slot.id] ||
                                              (timeBasedKey
                                                ? bookingDetails[timeBasedKey]
                                                : null);
                                            return (
                                              detail?.clientName ||
                                              "Unknown Client"
                                            );
                                          })()}
                                        </span>
                                        <span
                                          className={`ml-auto px-1.5 py-0.5 rounded-full text-xs font-medium ${(() => {
                                            const timeBasedKey = Object.keys(
                                              bookingDetails
                                            ).find((key) =>
                                              key.includes(
                                                `${
                                                  slot.startTimeDisplay ||
                                                  slot.startTime
                                                }-${
                                                  slot.endTimeDisplay ||
                                                  slot.endTime
                                                }`
                                              )
                                            );
                                            const detail =
                                              bookingDetails[slot.id] ||
                                              (timeBasedKey
                                                ? bookingDetails[timeBasedKey]
                                                : null);
                                            return detail?.status ===
                                              "confirmed"
                                              ? "bg-green-100 text-green-800 border border-green-200"
                                              : "bg-yellow-100 text-yellow-800 border border-green-200";
                                          })()}`}
                                        >
                                          {(() => {
                                            const timeBasedKey = Object.keys(
                                              bookingDetails
                                            ).find((key) =>
                                              key.includes(
                                                `${
                                                  slot.startTimeDisplay ||
                                                  slot.startTime
                                                }-${
                                                  slot.endTimeDisplay ||
                                                  slot.endTime
                                                }`
                                              )
                                            );
                                            const detail =
                                              bookingDetails[slot.id] ||
                                              (timeBasedKey
                                                ? bookingDetails[timeBasedKey]
                                                : null);
                                            return detail?.status ===
                                              "confirmed"
                                              ? "✓ Confirmed"
                                              : "⏳ Pending";
                                          })()}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-blue-600 text-xs">
                                          📧
                                        </span>
                                        <span className="text-xs text-blue-700">
                                          {(() => {
                                            const timeBasedKey = Object.keys(
                                              bookingDetails
                                            ).find((key) =>
                                              key.includes(
                                                `${
                                                  slot.startTimeDisplay ||
                                                  slot.startTime
                                                }-${
                                                  slot.endTimeDisplay ||
                                                  slot.endTime
                                                }`
                                              )
                                            );
                                            const detail =
                                              bookingDetails[slot.id] ||
                                              (timeBasedKey
                                                ? bookingDetails[timeBasedKey]
                                                : null);
                                            return (
                                              detail?.clientEmail || "No email"
                                            );
                                          })()}
                                        </span>
                                      </div>
                                      {(() => {
                                        const timeBasedKey = Object.keys(
                                          bookingDetails
                                        ).find((key) =>
                                          key.includes(
                                            `${
                                              slot.startTimeDisplay ||
                                              slot.startTime
                                            }-${
                                              slot.endTimeDisplay ||
                                              slot.endTime
                                            }`
                                          )
                                        );
                                        const detail =
                                          bookingDetails[slot.id] ||
                                          (timeBasedKey
                                            ? bookingDetails[timeBasedKey]
                                            : null);
                                        return detail?.notes ? (
                                          <div className="flex items-start gap-2">
                                            <span className="text-blue-600 text-xs mt-0.5">
                                              📝
                                            </span>
                                            <span className="text-xs text-blue-700 italic leading-tight">
                                              &ldquo;
                                              {detail.notes}
                                              &rdquo;
                                            </span>
                                          </div>
                                        ) : null;
                                      })()}
                                    </div>
                                  )}
                              </div>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 sm:py-8 text-gray-500">
                    <p className="text-sm sm:text-base">
                      No time slots configured for this day.
                    </p>
                    <p className="text-xs sm:text-sm mt-1">
                      Configure your default working hours in settings to
                      generate time slots.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <p className="text-sm sm:text-base">
                  This day is not marked as a working day.
                </p>
                <p className="text-xs sm:text-sm mt-1">
                  Toggle the switch above to make it a working day.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer - Mobile responsive */}
        <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-white/95 backdrop-blur">
          <button
            onClick={onClose}
            className="px-4 py-2 sm:px-6 sm:py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
