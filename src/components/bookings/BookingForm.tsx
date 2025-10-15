"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { UserIcon } from "@heroicons/react/24/outline";
import { useSnackbar } from "@/components/snackbar";
import { useDayAvailability } from "@/lib/hooks/queries";

import {
  bookingFormSchema,
  type BookingFormData,
} from "@/lib/validations/booking";
import SharedAvailabilityCalendar from "./SharedAvailabilityCalendar";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  startTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
  endTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
  isAvailable: boolean;
  isBooked?: boolean;
}

interface DayAvailability {
  date: Date;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

export default function BookingForm() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const searchParams = useSearchParams();
  const { success, error, warning } = useSnackbar();

  // Use TanStack Query for day availability
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const { data: dayAvailability, isLoading } = useDayAvailability(dateString);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      notes: "",
    },
  });

  // Prefill date from query string for rebooking (guard against same-date updates)
  useEffect(() => {
    const date = searchParams.get("date");
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        const current = format(selectedDate, "yyyy-MM-dd");
        const incoming = format(parsed, "yyyy-MM-dd");
        if (current !== incoming) {
          setSelectedDate(parsed);
        }
      }
    }
    // Do not prefill client details for privacy
  }, [searchParams, selectedDate]);

  // Preselect a slot after availability loads using start/end from query
  useEffect(() => {
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    if (start && end && dayAvailability?.timeSlots) {
      const slot = dayAvailability.timeSlots.find(
        (s) =>
          s.startTime === start &&
          s.endTime === end &&
          s.isAvailable &&
          !s.isBooked
      );
      if (
        slot &&
        (selectedTimeSlot?.startTime !== slot.startTime ||
          selectedTimeSlot?.endTime !== slot.endTime)
      ) {
        setSelectedTimeSlot(slot);
      }
    }
  }, [searchParams, dayAvailability, selectedTimeSlot]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.isAvailable && !slot.isBooked) {
      setSelectedTimeSlot(slot);
    }
  };

  const onSubmit = async (data: BookingFormData) => {
    if (!selectedTimeSlot || !selectedDate) {
      warning("Please select a date and time slot");
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          timeSlotId: selectedTimeSlot.id,
          date: format(selectedDate, "yyyy-MM-dd"),
          startTime: selectedTimeSlot.startTime,
          endTime: selectedTimeSlot.endTime,
          clientName: data.clientName,
          clientEmail: data.clientEmail,
          clientPhone: data.clientPhone,
          notes: data.notes,
        }),
      });

      if (response.ok) {
        success(
          "Booking created successfully! It's now pending your approval. You can review and accept it from the Appointments tab."
        );
        // Reset form
        reset();
        setSelectedTimeSlot(null);
        // Availability will automatically refresh via TanStack Query cache invalidation
      } else {
        const errorData = await response.json();
        error(`Error creating booking: ${errorData.message}`);
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      error("Error creating booking. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <SharedAvailabilityCalendar
        onDateSelect={handleDateSelect}
        onTimeSlotSelect={handleTimeSlotSelect}
        selectedDate={selectedDate}
        selectedTimeSlot={selectedTimeSlot}
        dayAvailability={
          dayAvailability ? { ...dayAvailability, date: selectedDate } : null
        }
        isLoading={isLoading}
        showBookingDetails={true}
      />

      {/* Booking Form */}
      {selectedTimeSlot && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-purple-600" />
            Client Information
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="clientName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Client Name *
                </label>
                <input
                  type="text"
                  id="clientName"
                  {...register("clientName")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.clientName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter client name"
                />
                {errors.clientName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.clientName.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="clientEmail"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Client Email *
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  {...register("clientEmail")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.clientEmail ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter client email"
                />
                {errors.clientEmail && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.clientEmail.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="clientPhone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Client Phone
                </label>
                <input
                  type="tel"
                  id="clientPhone"
                  {...register("clientPhone")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.clientPhone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter client phone"
                />
                {errors.clientPhone && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.clientPhone.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="notes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Notes
                </label>
                <input
                  type="text"
                  id="notes"
                  {...register("notes")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.notes ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Any special notes"
                />
                {errors.notes && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.notes.message}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`
                  w-full sm:w-auto px-6 py-3 text-white font-medium rounded-lg transition-all
                  ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl"
                  }
                `}
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Booking...
                  </div>
                ) : (
                  `Book ${
                    selectedTimeSlot.startTimeDisplay ||
                    selectedTimeSlot.startTime
                  } - ${
                    selectedTimeSlot.endTimeDisplay || selectedTimeSlot.endTime
                  }`
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
