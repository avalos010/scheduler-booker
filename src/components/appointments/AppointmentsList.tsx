"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  TrashIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

// Normalize YYYY-MM-DD dates to local timezone to avoid off-by-one when formatting
const toLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

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

// Local config inside BookingCard handles display styling

export default function AppointmentsList({ userId }: AppointmentsListProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [showDidShowModal, setShowDidShowModal] = useState(false);
  const [modalBooking, setModalBooking] = useState<Booking | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Booking["status"] | "all">(
    "all"
  );
  const [upcomingOnly, setUpcomingOnly] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const navigateToRebook = (date: string, start: string, end: string) => {
    const params = new URLSearchParams({ date, start, end });
    window.location.href = `/dashboard/bookings?${params.toString()}`;
  };

  const fetchBookings = useCallback(async () => {
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
  }, [userId]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

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

  const deleteBooking = async (bookingId: string) => {
    if (!window.confirm("Delete this booking? This cannot be undone.")) return;
    setUpdatingStatus(bookingId);
    try {
      const response = await fetch(`/api/bookings?bookingId=${bookingId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      } else {
        const error = await response.json();
        alert(`Error deleting booking: ${error.message}`);
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Error deleting booking. Please try again.");
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
            <button
              onClick={() =>
                navigateToRebook(
                  booking.date,
                  booking.start_time,
                  booking.end_time
                )
              }
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
              title="Rebook this appointment"
            >
              <CalendarIcon className="h-4 w-4" />
              Rebook
            </button>
            <button
              onClick={() => deleteBooking(booking.id)}
              disabled={updatingStatus === booking.id}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              title="Delete booking"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        );
      case "confirmed": {
        const startDateTime = new Date(`${booking.date}T${booking.start_time}`);
        const fifteenMinutesMs = 15 * 60 * 1000;
        const startWithGrace = new Date(
          startDateTime.getTime() + fifteenMinutesMs
        );
        const now = new Date();
        const isBeforeGrace = now < startWithGrace;
        const isBeforeStart = now < startDateTime;

        return (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => updateBookingStatus(booking.id, "completed")}
                disabled={updatingStatus === booking.id || isBeforeStart}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircleIcon className="h-4 w-4" />
                Mark Complete
              </button>
              <button
                onClick={() => updateBookingStatus(booking.id, "no-show")}
                disabled={updatingStatus === booking.id || isBeforeGrace}
                title={
                  isBeforeGrace
                    ? "You can only mark no-show 15 minutes after start time"
                    : undefined
                }
                className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
              >
                <XCircleIcon className="h-4 w-4" />
                No Show
              </button>
              <button
                onClick={() =>
                  navigateToRebook(
                    booking.date,
                    booking.start_time,
                    booking.end_time
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                title="Rebook this appointment"
              >
                <CalendarIcon className="h-4 w-4" />
                Rebook
              </button>
              <button
                onClick={() => deleteBooking(booking.id)}
                disabled={updatingStatus === booking.id}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                title="Delete booking"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
            {!isBeforeGrace && (
              <button
                onClick={() => {
                  setModalBooking(booking);
                  setShowDidShowModal(true);
                }}
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
                title="Quick action: confirm whether the client arrived"
              >
                Did they show up?
              </button>
            )}
          </div>
        );
      }
      default: {
        const isCompleted = booking.status === "completed";
        return (
          <div className="flex gap-2">
            {!isCompleted && (
              <button
                onClick={() =>
                  navigateToRebook(
                    booking.date,
                    booking.start_time,
                    booking.end_time
                  )
                }
                className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
                title="Rebook this appointment"
              >
                <CalendarIcon className="h-4 w-4" />
                Rebook
              </button>
            )}
            <button
              onClick={() => deleteBooking(booking.id)}
              disabled={updatingStatus === booking.id}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              title="Delete booking"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
        );
      }
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

  // Filters
  const normalizedQuery = query.trim().toLowerCase();
  const now = new Date();
  const filtered = bookings.filter((b) => {
    const matchesStatus =
      statusFilter === "all" ? true : b.status === statusFilter;
    const matchesQuery = normalizedQuery
      ? b.client_name.toLowerCase().includes(normalizedQuery) ||
        b.client_email.toLowerCase().includes(normalizedQuery)
      : true;
    const startDateTime = new Date(`${b.date}T${b.start_time}`);
    const matchesUpcoming = upcomingOnly ? startDateTime >= now : true;
    return matchesStatus && matchesQuery && matchesUpcoming;
  });

  // Group bookings by status
  const pendingBookings = filtered.filter((b) => b.status === "pending");
  const confirmedBookings = filtered.filter((b) => b.status === "confirmed");
  const otherBookings = filtered.filter(
    (b) => !["pending", "confirmed"].includes(b.status)
  );

  return (
    <div className="p-6">
      {/* Controls */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3 max-w-3xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clients"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 border-gray-300 bg-white text-gray-900 placeholder-gray-500"
        />
        {/* Fancy status dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsStatusOpen((v) => !v)}
            className="w-full px-3 py-2 border rounded-lg bg-white text-gray-900 border-gray-300 text-left flex items-center justify-between hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            aria-haspopup="listbox"
            aria-expanded={isStatusOpen}
            title="Filter by status"
          >
            <span className="truncate">
              {statusFilter === "all"
                ? "All statuses"
                : statusFilter === "pending"
                ? "Pending"
                : statusFilter === "confirmed"
                ? "Confirmed"
                : statusFilter === "cancelled"
                ? "Cancelled"
                : statusFilter === "completed"
                ? "Completed"
                : "No Show"}
            </span>
            <svg
              className={`h-4 w-4 text-gray-500 transition-transform ${
                isStatusOpen ? "rotate-180" : "rotate-0"
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.27a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          {isStatusOpen && (
            <ul
              className="absolute z-10 mt-2 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
              role="listbox"
            >
              {(
                [
                  { value: "all", label: "All statuses" },
                  { value: "pending", label: "Pending" },
                  { value: "confirmed", label: "Confirmed" },
                  { value: "cancelled", label: "Cancelled" },
                  { value: "completed", label: "Completed" },
                  { value: "no-show", label: "No Show" },
                ] as Array<{ value: Booking["status"] | "all"; label: string }>
              ).map((opt) => (
                <li
                  key={opt.value}
                  className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 text-gray-900 ${
                    statusFilter === opt.value ? "bg-gray-50" : ""
                  }`}
                  role="option"
                  aria-selected={statusFilter === opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setIsStatusOpen(false);
                  }}
                >
                  {opt.label}
                </li>
              ))}
            </ul>
          )}
        </div>
        <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer select-none bg-white text-gray-900">
          <input
            type="checkbox"
            checked={upcomingOnly}
            onChange={(e) => setUpcomingOnly(e.target.checked)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">Upcoming only</span>
        </label>
      </div>
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

      {/* Did they show up? Modal */}
      {showDidShowModal && modalBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDidShowModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200">
            <div className="p-5 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Did they show up?
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {format(new Date(modalBooking.date), "EEEE, MMMM d, yyyy")} ·{" "}
                {modalBooking.start_time} - {modalBooking.end_time}
              </p>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">
                Confirm whether the client attended this appointment.
              </p>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowDidShowModal(false)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!modalBooking) return;
                    await updateBookingStatus(modalBooking.id, "no-show");
                    setShowDidShowModal(false);
                    setModalBooking(null);
                  }}
                  disabled={updatingStatus === modalBooking.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  No, mark No Show
                </button>
                <button
                  onClick={async () => {
                    if (!modalBooking) return;
                    await updateBookingStatus(modalBooking.id, "completed");
                    setShowDidShowModal(false);
                    setModalBooking(null);
                  }}
                  disabled={updatingStatus === modalBooking.id}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Yes, mark Completed
                </button>
              </div>
            </div>
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
                {format(toLocalDate(booking.date), "EEEE, MMMM d, yyyy")}
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
