"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
} from "@heroicons/react/24/outline";

interface Booking {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  notes: string | null;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no-show";
  created_at: string;
}

interface AppointmentsListProps {
  userId: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: ClockIcon,
  },
  confirmed: {
    label: "Confirmed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircleIcon,
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircleIcon,
  },
  completed: {
    label: "Completed",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: CheckCircleIcon,
  },
  "no-show": {
    label: "No Show",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: XCircleIcon,
  },
};

export default function AppointmentsList({ userId }: AppointmentsListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [userId]);

  const fetchBookings = async () => {
    try {
      const response = await fetch(`/api/bookings?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    setUpdatingStatus(bookingId);
    try {
      const response = await fetch("/api/bookings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookingId,
          status: newStatus,
        }),
      });

      if (response.ok) {
        // Update the local state
        setBookings((prev) =>
          prev.map((booking) =>
            booking.id === bookingId
              ? { ...booking, status: newStatus as Booking["status"] }
              : booking
          )
        );
      } else {
        const error = await response.json();
        alert(`Error updating booking: ${error.message}`);
      }
    } catch (error) {
      console.error("Error updating booking status:", error);
      alert("Error updating booking status. Please try again.");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusActions = (booking: Booking) => {
    switch (booking.status) {
      case "pending":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => updateBookingStatus(booking.id, "confirmed")}
              disabled={updatingStatus === booking.id}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Accept
            </button>
            <button
              onClick={() => updateBookingStatus(booking.id, "cancelled")}
              disabled={updatingStatus === booking.id}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <XCircleIcon className="h-4 w-4" />
              Decline
            </button>
          </div>
        );
      case "confirmed":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => updateBookingStatus(booking.id, "completed")}
              disabled={updatingStatus === booking.id}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Mark Complete
            </button>
            <button
              onClick={() => updateBookingStatus(booking.id, "no-show")}
              disabled={updatingStatus === booking.id}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
            >
              <XCircleIcon className="h-4 w-4" />
              No Show
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading appointments...</p>
        </div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="p-6">
        <div className="text-center py-8">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No appointments
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            You don&apos;t have any appointments yet. Create a new booking to
            get started.
          </p>
        </div>
      </div>
    );
  }

  // Group bookings by status
  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const otherBookings = bookings.filter(
    (b) => !["pending", "confirmed"].includes(b.status)
  );

  return (
    <div className="p-6">
      {/* Pending Bookings */}
      {pendingBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-yellow-600" />
            Pending Bookings ({pendingBookings.length})
          </h2>
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actions={getStatusActions(booking)}
                updatingStatus={updatingStatus === booking.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Bookings */}
      {confirmedBookings.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            Confirmed Appointments ({confirmedBookings.length})
          </h2>
          <div className="space-y-4">
            {confirmedBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actions={getStatusActions(booking)}
                updatingStatus={updatingStatus === booking.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Bookings */}
      {otherBookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-gray-600" />
            Other Appointments ({otherBookings.length})
          </h2>
          <div className="space-y-4">
            {otherBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                actions={getStatusActions(booking)}
                updatingStatus={updatingStatus === booking.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface BookingCardProps {
  booking: Booking;
  actions: React.ReactNode;
  updatingStatus: boolean;
}

function BookingCard({ booking, actions, updatingStatus }: BookingCardProps) {
  const statusConfig = {
    pending: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-800 border-yellow-200",
      icon: ClockIcon,
    },
    confirmed: {
      label: "Confirmed",
      color: "bg-green-100 text-green-800 border-green-200",
      icon: CheckCircleIcon,
    },
    cancelled: {
      label: "Cancelled",
      color: "bg-red-100 text-red-800 border-red-200",
      icon: XCircleIcon,
    },
    completed: {
      label: "Completed",
      color: "bg-blue-100 text-blue-800 border-blue-200",
      icon: CheckCircleIcon,
    },
    "no-show": {
      label: "No Show",
      color: "bg-gray-100 text-gray-800 border-gray-200",
      icon: XCircleIcon,
    },
  };

  const config = statusConfig[booking.status];
  const StatusIcon = config.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {booking.client_name}
              </h3>
              <p className="text-sm text-gray-500">
                {format(new Date(booking.date), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${config.color}`}
            >
              <StatusIcon className="h-4 w-4" />
              {config.label}
            </span>
          </div>

          {/* Time */}
          <div className="mb-4">
            <p className="text-lg font-medium text-gray-900">
              {booking.start_time} - {booking.end_time}
            </p>
          </div>

          {/* Client Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <EnvelopeIcon className="h-4 w-4" />
              {booking.client_email}
            </div>
            {booking.client_phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <PhoneIcon className="h-4 w-4" />
                {booking.client_phone}
              </div>
            )}
          </div>

          {/* Notes */}
          {booking.notes && (
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <ChatBubbleLeftIcon className="h-4 w-4 mt-0.5" />
              <p>{booking.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 lg:items-end">
          {actions}
          {updatingStatus && (
            <div className="text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 inline-block mr-2"></div>
              Updating...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
