"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { UserIcon, CalendarIcon } from "@heroicons/react/24/outline";
import { useSnackbar } from "@/components/snackbar";
import {
  useDayAvailability,
  useCreateBooking,
  useDeleteBooking,
  useBookings,
} from "@/lib/hooks/queries";
import type { Booking } from "@/lib/types/availability";

import {
  bookingFormSchema,
  type BookingFormData,
} from "@/lib/validations/booking";
import SharedAvailabilityCalendar from "./SharedAvailabilityCalendar";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  startTimeDisplay?: string;
  endTimeDisplay?: string;
  isAvailable: boolean;
  isBooked?: boolean;
}

interface RebookFormProps {
  bookingId: string;
}

export default function RebookForm({ bookingId }: RebookFormProps) {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [originalBooking, setOriginalBooking] = useState<Booking | null>(null);
  const { success, error, warning } = useSnackbar();

  // Use TanStack Query for day availability and mutations
  const dateString = format(selectedDate, "yyyy-MM-dd");
  const { data: dayAvailability, isLoading } = useDayAvailability(dateString);
  const { data: bookingsData, isLoading: isLoadingBookings } = useBookings();
  const createBookingMutation = useCreateBooking();
  const deleteBookingMutation = useDeleteBooking();

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

  // Find original booking from existing bookings data
  useEffect(() => {
    if (bookingsData?.bookings && bookingId) {
      const booking = bookingsData.bookings.find((b) => b.id === bookingId);
      if (booking) {
        setOriginalBooking(booking);
        // Pre-fill form with original booking details
        reset({
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          clientPhone: booking.client_phone || "",
          notes: booking.notes || "",
        });
        // Set the original date
        const originalDate = new Date(booking.date);
        setSelectedDate(originalDate);
      } else {
        error("Booking not found");
        router.push("/dashboard/appointments");
      }
    }
  }, [bookingsData, bookingId, reset, error, router]);

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
      // First create the new booking
      await createBookingMutation.mutateAsync({
        timeSlotId: selectedTimeSlot.id,
        date: format(selectedDate, "yyyy-MM-dd"),
        startTime: selectedTimeSlot.startTime,
        endTime: selectedTimeSlot.endTime,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        notes: data.notes,
      });

      // Then delete the old booking
      await deleteBookingMutation.mutateAsync(bookingId);

      success(
        "Appointment rebooked successfully! The old appointment has been cancelled."
      );

      // Navigate back to appointments
      router.push("/dashboard/appointments");
    } catch (err) {
      console.error("Error rebooking appointment:", err);
      error(
        err instanceof Error
          ? err.message
          : "Error rebooking appointment. Please try again."
      );
    }
  };

  if (isLoadingBookings || !originalBooking) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <p className="ml-3 text-gray-600">
          {isLoadingBookings
            ? "Loading bookings..."
            : "Loading booking details..."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Original Booking Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">
          Original Appointment
        </h3>
        <div className="text-sm text-blue-800">
          <p>
            <strong>Date:</strong>{" "}
            {format(new Date(originalBooking.date), "EEEE, MMMM d, yyyy")}
          </p>
          <p>
            <strong>Time:</strong>{" "}
            {originalBooking.startTimeDisplay || originalBooking.start_time} -{" "}
            {originalBooking.endTimeDisplay || originalBooking.end_time}
          </p>
          <p>
            <strong>Client:</strong> {originalBooking.client_name}
          </p>
        </div>
      </div>

      {/* New Booking Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Client Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <UserIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              Client Information
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Client Name *
              </label>
              <input
                {...register("clientName")}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 text-gray-900"
                placeholder="Enter client name"
              />
              {errors.clientName && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.clientName.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                {...register("clientEmail")}
                type="email"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 text-gray-900"
                placeholder="Enter email address"
              />
              {errors.clientEmail && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.clientEmail.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                {...register("clientPhone")}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 text-gray-900"
                placeholder="Enter phone number"
              />
              {errors.clientPhone && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.clientPhone.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                {...register("notes")}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 border-gray-300 text-gray-900"
                placeholder="Additional notes or requirements"
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.notes.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Date and Time Selection */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <CalendarIcon className="h-5 w-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              New Date & Time
            </h3>
          </div>

          <SharedAvailabilityCalendar
            onDateSelect={handleDateSelect}
            onTimeSlotSelect={handleTimeSlotSelect}
            selectedDate={selectedDate}
            selectedTimeSlot={selectedTimeSlot}
            dayAvailability={
              dayAvailability
                ? { ...dayAvailability, date: selectedDate }
                : null
            }
            isLoading={isLoading}
          />
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => router.push("/dashboard/appointments")}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              createBookingMutation.isPending ||
              deleteBookingMutation.isPending
            }
            className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {(isSubmitting ||
              createBookingMutation.isPending ||
              deleteBookingMutation.isPending) && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            {isSubmitting ||
            createBookingMutation.isPending ||
            deleteBookingMutation.isPending
              ? "Rebooking..."
              : "Rebook Appointment"}
          </button>
        </div>
      </form>
    </div>
  );
}
