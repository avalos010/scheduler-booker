"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import { useSnackbar } from "@/components/snackbar";
import {
  useBookingByToken,
  useUpdateBookingByToken,
  useCancelBookingByToken,
} from "@/lib/hooks/queries";

// Validation schema for booking updates
const bookingUpdateSchema = z.object({
  clientName: z.string().min(2, "Name must be at least 2 characters"),
  clientEmail: z.string().email("Please enter a valid email"),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
});

type BookingUpdateFormData = z.infer<typeof bookingUpdateSchema>;

export default function PublicBookingDetailsPage() {
  const params = useParams();
  const token = params.token as string;
  const { success, error: showError } = useSnackbar();

  const [isEditing, setIsEditing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Fetch booking using TanStack Query
  const {
    data: bookingData,
    isLoading: loading,
    error,
  } = useBookingByToken(token);
  const booking = bookingData?.booking;

  // Mutations
  const updateBookingMutation = useUpdateBookingByToken();
  const cancelBookingMutation = useCancelBookingByToken();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<BookingUpdateFormData>({
    resolver: zodResolver(bookingUpdateSchema),
  });

  // Reset form when booking data loads
  useEffect(() => {
    if (booking) {
      reset({
        clientName: booking.client_name,
        clientEmail: booking.client_email,
        clientPhone: booking.client_phone || "",
        notes: booking.notes || "",
      });
    }
  }, [booking, reset]);

  // Handle booking update
  const onSubmit = async (data: BookingUpdateFormData) => {
    try {
      await updateBookingMutation.mutateAsync({
        token,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        notes: data.notes,
      });

      setIsEditing(false);
      success("Booking updated successfully!");
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to update booking"
      );
    }
  };

  // Handle booking cancellation
  const handleCancelBooking = async () => {
    try {
      await cancelBookingMutation.mutateAsync(token);

      success("Booking cancelled successfully!");
      setShowCancelModal(false);
      // TanStack Query will automatically refetch and update the booking status
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Failed to cancel booking"
      );
      setShowCancelModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  if (error || (!loading && !booking)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="mx-auto max-w-4xl py-10 px-6 lg:px-8">
          <div className="rounded-2xl bg-white/70 p-8 backdrop-blur ring-1 ring-red-200/60 shadow-lg text-center">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Booking Not Found
            </h1>
            <p className="text-gray-600 mb-6">
              {error instanceof Error
                ? error.message
                : "The booking you're looking for doesn't exist or the access link is invalid."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!booking) {
    return null; // This handles the case where loading is done but booking is still undefined
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
    completed: "bg-blue-100 text-blue-800",
    "no-show": "bg-gray-100 text-gray-800",
  };

  const statusColor =
    statusColors[booking.status as keyof typeof statusColors] ||
    "bg-gray-100 text-gray-800";

  const canEdit =
    booking.status !== "cancelled" && booking.status !== "completed";
  const canCancel =
    booking.status !== "cancelled" && booking.status !== "completed";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
      <div className="mx-auto max-w-4xl py-10 px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 rounded-2xl bg-white/70 p-8 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Your Booking Details
                </span>
              </h1>
              <p className="mt-2 text-gray-700">
                View and manage your appointment information.
              </p>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColor}`}
            >
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Booking Information */}
        <div className="mb-8 rounded-2xl bg-white/70 p-6 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
            Appointment Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CalendarDaysIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="text-lg text-gray-900">
                    {new Date(booking.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Time</p>
                  <p className="text-lg text-gray-900">
                    {booking.startTimeDisplay || booking.start_time} -{" "}
                    {booking.endTimeDisplay || booking.end_time}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <UserIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-lg text-gray-900">{booking.client_name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <EnvelopeIcon className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Email</p>
                  <p className="text-lg text-gray-900">
                    {booking.client_email}
                  </p>
                </div>
              </div>

              {booking.client_phone && (
                <div className="flex items-center gap-3">
                  <PhoneIcon className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <p className="text-lg text-gray-900">
                      {booking.client_phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {booking.notes && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-start gap-3">
                <DocumentTextIcon className="h-5 w-5 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    Notes
                  </p>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {booking.notes}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Edit Form */}
        {canEdit && (
          <div className="rounded-2xl bg-white/70 p-6 backdrop-blur ring-1 ring-gray-200/60 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-blue-600" />
                {isEditing ? "Edit Your Information" : "Update Booking"}
              </h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-all"
                >
                  Edit Details
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="clientName"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Your Name *
                    </label>
                    <input
                      id="clientName"
                      type="text"
                      {...register("clientName")}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.clientName ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter your name"
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
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Your Email *
                    </label>
                    <input
                      id="clientEmail"
                      type="email"
                      {...register("clientEmail")}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                        errors.clientEmail
                          ? "border-red-500"
                          : "border-gray-300"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="clientPhone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Phone Number
                    </label>
                    <input
                      id="clientPhone"
                      type="tel"
                      {...register("clientPhone")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Enter your phone"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Special Notes
                    </label>
                    <input
                      id="notes"
                      type="text"
                      {...register("notes")}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="Any special requirements"
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`inline-flex items-center px-6 py-3 font-medium rounded-xl transition-all ${
                      isSubmitting
                        ? "bg-gray-400 cursor-not-allowed text-white"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      reset({
                        clientName: booking.client_name,
                        clientEmail: booking.client_email,
                        clientPhone: booking.client_phone || "",
                        notes: booking.notes || "",
                      });
                    }}
                    className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <p className="text-gray-600">
                Click &ldquo;Edit Details&rdquo; to update your contact
                information or add special notes.
              </p>
            )}
          </div>
        )}

        {/* Cancel Booking */}
        {canCancel && (
          <div className="mt-8 rounded-2xl bg-red-50/70 p-6 backdrop-blur ring-1 ring-red-200/60 shadow-lg">
            <h3 className="text-lg font-semibold text-red-900 mb-2">
              Cancel Booking
            </h3>
            <p className="text-red-700 mb-4">
              Need to cancel your appointment? Click the button below to cancel
              this booking.
            </p>
            <button
              onClick={() => setShowCancelModal(true)}
              className="px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all"
            >
              Cancel Booking
            </button>
          </div>
        )}

        {/* Cancel Confirmation Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
              <XCircleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-2 text-center">
                Cancel Booking?
              </h3>
              <p className="text-gray-600 mb-6 text-center">
                Are you sure you want to cancel this booking? This action cannot
                be undone.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={handleCancelBooking}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-all"
                >
                  Yes, Cancel Booking
                </button>
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-all"
                >
                  Keep Booking
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
