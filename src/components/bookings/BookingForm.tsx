"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, addDays, startOfDay, isBefore } from "date-fns";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import {
  bookingFormSchema,
  type BookingFormData,
} from "@/lib/validations/booking";

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

interface BookingFormProps {
  userId: string;
}

export default function BookingForm({ userId }: BookingFormProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
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
  } = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      notes: "",
    },
  });

  // Generate available dates (next 30 days)
  useEffect(() => {
    const dates: Date[] = [];
    const today = startOfDay(new Date());

    for (let i = 0; i < 30; i++) {
      const date = addDays(today, i);
      dates.push(date);
    }

    setAvailableDates(dates);
  }, []);

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

  const onSubmit = async (data: BookingFormData) => {
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
          "Booking created successfully! It's now pending your approval. You can review and accept it from the Appointments tab."
        );
        // Reset form
        reset();
        setSelectedTimeSlot(null);
        // Refresh availability
        fetchDayAvailability(selectedDate);
      } else {
        const error = await response.json();
        alert(`Error creating booking: ${error.message}`);
      }
    } catch (error) {
      console.error("Error creating booking:", error);
      alert("Error creating booking. Please try again.");
    }
  };

  const isDateDisabled = (date: Date) => {
    return isBefore(date, startOfDay(new Date()));
  };

  const getAvailableSlots = () => {
    if (!dayAvailability) return [];
    return dayAvailability.timeSlots.filter(
      (slot) => slot.isAvailable && !slot.isBooked
    );
  };

  return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
          Select Date
        </h3>
        <div className="grid grid-cols-7 gap-2 sm:gap-3">
          {availableDates.map((date) => (
            <button
              key={date.toISOString()}
              onClick={() => handleDateSelect(date)}
              disabled={isDateDisabled(date)}
              className={`
                p-3 text-sm font-medium rounded-lg transition-all
                ${
                  selectedDate &&
                  format(selectedDate, "yyyy-MM-dd") ===
                    format(date, "yyyy-MM-dd")
                    ? "bg-blue-600 text-white shadow-lg"
                    : isDateDisabled(date)
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-white text-gray-700 hover:bg-blue-50 hover:border-blue-200 border border-gray-200"
                }
              `}
            >
              <div className="text-xs text-gray-500 mb-1">
                {format(date, "EEE")}
              </div>
              <div className="text-lg">{format(date, "d")}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slot Selection */}
      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-green-600" />
            Available Time Slots for{" "}
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </h3>

          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading availability...</p>
            </div>
          ) : dayAvailability && dayAvailability.isWorkingDay ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {getAvailableSlots().map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => handleTimeSlotSelect(slot)}
                  className={`
                    p-3 text-sm font-medium rounded-lg border transition-all
                    ${
                      selectedTimeSlot?.id === slot.id
                        ? "bg-green-600 text-white border-green-600 shadow-lg"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-green-50 hover:border-green-200"
                    }
                  `}
                >
                  <div className="font-semibold">{slot.startTime}</div>
                  <div className="text-xs text-gray-500">to {slot.endTime}</div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              <p>No working hours set for this day.</p>
            </div>
          )}
        </div>
      )}

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
                  `Book ${selectedTimeSlot.startTime} - ${selectedTimeSlot.endTime}`
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
