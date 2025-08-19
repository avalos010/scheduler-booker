"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { UserIcon, PhoneIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import {
  publicBookingFormSchema,
  type PublicBookingFormData,
} from "@/lib/validations/booking";
import SharedAvailabilityCalendar from "./SharedAvailabilityCalendar";

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked?: boolean;
}

interface DayAvailability {
  date: Date;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

interface PublicBookingFormProps {
  userId: string;
}

export default function PublicBookingForm({ userId }: PublicBookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null
  );
  const [dayAvailability, setDayAvailability] =
    useState<DayAvailability | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PublicBookingFormData>({
    resolver: zodResolver(publicBookingFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      notes: "",
    },
  });

  // Fetch availability for selected date
  useEffect(() => {
    if (selectedDate) {
      fetchDayAvailability(selectedDate);
    }
  }, [selectedDate, userId]);

  const fetchDayAvailability = async (date: Date) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/availability/public?date=${format(
          date,
          "yyyy-MM-dd"
        )}&userId=${userId}`
      );
      if (response.ok) {
        const data = await response.json();
        setDayAvailability(data);
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.isAvailable && !slot.isBooked) {
      setSelectedTimeSlot(slot);
    }
  };

  const onSubmit = async (data: PublicBookingFormData) => {
    if (!selectedTimeSlot || !selectedDate) {
      alert("Please select a date and time slot");
      return;
    }

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
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
        alert(
          "Booking request submitted successfully! We'll review your request and confirm your appointment soon. You'll receive an email confirmation once approved."
        );
        // Reset form
        reset();
        setSelectedTimeSlot(null);
        // Refresh availability
        fetchDayAvailability(selectedDate);
      } else {
        const error = await response.json();
        alert(`Error submitting booking: ${error.message}`);
      }
    } catch (error) {
      console.error("Error submitting booking:", error);
      alert("Error submitting booking. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <SharedAvailabilityCalendar
        userId={userId}
        onDateSelect={handleDateSelect}
        onTimeSlotSelect={handleTimeSlotSelect}
        selectedDate={selectedDate}
        selectedTimeSlot={selectedTimeSlot}
        dayAvailability={dayAvailability}
        isLoading={isLoading}
        fetchDayAvailability={fetchDayAvailability}
        showBookingDetails={false}
      />

      {/* Booking Form */}
      {selectedTimeSlot && (
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-purple-600" />
            Your Information
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="clientName"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Your Name *
                </label>
                <input
                  type="text"
                  id="clientName"
                  {...register("clientName")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.clientName ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter your full name"
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
                  Your Email *
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  {...register("clientEmail")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.clientEmail ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter your email"
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
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="clientPhone"
                  {...register("clientPhone")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.clientPhone ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Enter your phone number"
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
                  Special Notes
                </label>
                <input
                  type="text"
                  id="notes"
                  {...register("notes")}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.notes ? "border-red-500" : "border-gray-300"
                  }`}
                  placeholder="Any special requirements"
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
                    Submitting Request...
                  </div>
                ) : (
                  `Request ${selectedTimeSlot.startTime} - ${selectedTimeSlot.endTime}`
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
