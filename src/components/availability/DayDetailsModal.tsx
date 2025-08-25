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
  userId: string;
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
  userId,
  toggleTimeSlot,
  toggleWorkingDay,
  regenerateDaySlots,
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
    if (!isOpen || !selectedDate || !userId) {
      return;
    }

    const fetchBookingDetails = async () => {
      try {
        const dateKey = format(selectedDate, "yyyy-MM-dd");

        // Fetch booking details for this date
        const response = await fetch(
          `/api/availability/public?date=${dateKey}&userId=${userId}`
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

            console.log("🔍 DayDetailsModal: Booking details fetched:", {
              apiSlots: data.timeSlots,
              mappedDetails: details,
              detailsCount: Object.keys(details).length,
              availabilitySlots: dayAvailability?.timeSlots || [],
              // Debug: Show ID comparison
              slotIdComparison: data.timeSlots.map(
                (slot: {
                  id: string;
                  isBooked: boolean;
                  bookingDetails?: {
                    clientName: string;
                    clientEmail: string;
                    notes?: string;
                    status: string;
                  };
                }) => ({
                  apiSlotId: slot.id,
                  isBooked: slot.isBooked,
                  hasBookingDetails: !!slot.bookingDetails,
                  bookingDetails: slot.bookingDetails,
                })
              ),
            });
            setBookingDetails(details);
          }
        }
      } catch (error) {
        console.error("Error fetching booking details:", error);
      }
    };

    fetchBookingDetails();
  }, [isOpen, selectedDate, userId]);

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
                      dayAvailability.timeSlots.filter(
                        (s) => s.isAvailable && !s.isBooked
                      ).length
                    }
                    /{dayAvailability.timeSlots.length} available
                  </span>
                </div>

                {dayAvailability.timeSlots.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 p-2 sm:p-3 bg-white">
                    {/* Two columns with expanded rows for booking details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                      {dayAvailability.timeSlots.map((slot) => (
                        <div key={slot.id} className="space-y-2">
                          <div className="space-y-2">
                            <button
                              onClick={async () =>
                                slot.isBooked
                                  ? undefined // Disable clicking for booked slots
                                  : await toggleTimeSlot(selectedDate, slot.id)
                              }
                              className={`w-full px-3 py-2 sm:py-3 text-sm rounded-md border transition-colors ${
                                slot.isBooked
                                  ? "bg-blue-50 border-blue-200 text-blue-800 cursor-not-allowed"
                                  : slot.isAvailable
                                  ? "bg-green-50 border-green-200 text-green-800 hover:bg-green-100 active:bg-green-200"
                                  : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100 active:bg-gray-200"
                              }`}
                              title={
                                slot.isBooked
                                  ? "Booked - cannot modify"
                                  : slot.isAvailable
                                  ? "Mark unavailable"
                                  : "Mark available"
                              }
                              disabled={slot.isBooked}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium truncate">
                                  {slot.startTime} - {slot.endTime}
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
                                      `${slot.startTime}-${slot.endTime}`
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
                                              `${slot.startTime}-${slot.endTime}`
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
                                              `${slot.startTime}-${slot.endTime}`
                                            )
                                          );
                                          const detail =
                                            bookingDetails[slot.id] ||
                                            (timeBasedKey
                                              ? bookingDetails[timeBasedKey]
                                              : null);
                                          return detail?.status === "confirmed"
                                            ? "bg-green-100 text-green-800 border border-green-200"
                                            : "bg-yellow-100 text-yellow-800 border border-green-200";
                                        })()}`}
                                      >
                                        {(() => {
                                          const timeBasedKey = Object.keys(
                                            bookingDetails
                                          ).find((key) =>
                                            key.includes(
                                              `${slot.startTime}-${slot.endTime}`
                                            )
                                          );
                                          const detail =
                                            bookingDetails[slot.id] ||
                                            (timeBasedKey
                                              ? bookingDetails[timeBasedKey]
                                              : null);
                                          return detail?.status === "confirmed"
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
                                              `${slot.startTime}-${slot.endTime}`
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
                                          `${slot.startTime}-${slot.endTime}`
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
                            </button>

                            {/* Booking details now shown inline within the button */}
                            {/* {slot.isBooked &&
                              Object.keys(bookingDetails).length > 0 && (
                                <div className="ml-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-blue-600 text-sm">
                                      👤
                                    </span>
                                    <span className="text-sm font-medium text-blue-900">
                                      {Object.values(bookingDetails)[0]
                                        ?.clientName || "Unknown Client"}
                                    </span>
                                    <span
                                      className={`ml-auto px-2 py-1 rounded-full text-xs font-medium ${
                                        Object.values(bookingDetails)[0]
                                          ?.status === "confirmed"
                                          ? "bg-green-100 text-green-800 border border-green-200"
                                          : "bg-yellow-100 text-yellow-800 border border-green-200"
                                      }`}
                                    >
                                      {Object.values(bookingDetails)[0]
                                        ?.status === "confirmed"
                                        ? "✓ Confirmed"
                                        : "⏳ Pending"}
                                    </span>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-blue-600 text-xs">
                                        📧
                                      </span>
                                      <span className="text-xs text-blue-800">
                                        {Object.values(bookingDetails)[0]
                                          ?.clientEmail || "No email"}
                                      </span>
                                    </div>
                                    {Object.values(bookingDetails)[0]
                                      ?.notes && (
                                      <div className="flex items-start gap-2">
                                        <span className="text-blue-600 text-xs mt-0.5">
                                          📝
                                        </span>
                                        <span className="text-xs text-blue-700 italic leading-tight">
                                          &ldquo;
                                          {
                                            Object.values(bookingDetails)[0]
                                              ?.notes
                                          }
                                          &rdquo;
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )} */}
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
