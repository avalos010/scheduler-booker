"use client";

import { useState } from "react";
import { useSnackbar } from "@/components/snackbar";
import {
  useBookings,
  useUpdateBookingStatus,
  useDeleteBooking,
} from "@/lib/hooks/queries";
import type { Booking } from "@/lib/types/availability";

import { ClockIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import AppointmentsFilters from "./AppointmentsFilters";
import AppointmentsSection from "./AppointmentsSection";
import BookingActions from "./BookingActions";
import DidShowModal from "./DidShowModal";

// Booking type is now imported from types/availability

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AppointmentsListProps {}

// Local config inside BookingCard handles display styling

export default function AppointmentsList({}: AppointmentsListProps) {
  const { data: bookingsData, isLoading, error: fetchError } = useBookings();
  const updateBookingStatusMutation = useUpdateBookingStatus();
  const deleteBookingMutation = useDeleteBooking();

  // Modal states
  const [showDidShowModal, setShowDidShowModal] = useState(false);
  const [modalBooking, setModalBooking] = useState<Booking | null>(null);

  // Filter states
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<Booking["status"] | "all">(
    "all"
  );
  const [upcomingOnly, setUpcomingOnly] = useState(false);

  const { success, error } = useSnackbar();

  const bookings = bookingsData?.bookings || [];

  // Handle fetch error
  if (fetchError) {
    console.error("Error fetching bookings:", fetchError);
  }

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    console.log("updateBookingStatus called:", { bookingId, newStatus });
    try {
      await updateBookingStatusMutation.mutateAsync({
        bookingId,
        status: newStatus,
      });
      success("Booking status updated successfully");
    } catch (err) {
      console.error("Error updating booking status:", err);
      // Check if it's a specific error message from the API
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error updating booking status. Please try again.";

      // Show specific error messages for common cases
      if (errorMessage) {
        error(errorMessage);
      }
    }
  };

  const deleteBooking = async (bookingId: string) => {
    console.log("deleteBooking called:", { bookingId });
    if (!window.confirm("Delete this booking? This cannot be undone.")) return;
    try {
      await deleteBookingMutation.mutateAsync(bookingId);
      // The bookings query will automatically refetch and update the UI
      success("Booking deleted successfully");
    } catch (err) {
      console.error("Error deleting booking:", err);
      error(
        err instanceof Error
          ? err.message
          : "Error deleting booking. Please try again."
      );
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
    const startDateTime = new Date(`${b.date}T${b.start_time}:00`);
    const matchesUpcoming = upcomingOnly ? startDateTime >= now : true;
    return matchesStatus && matchesQuery && matchesUpcoming;
  });

  // Group bookings by status
  const pendingBookings = filtered.filter((b) => b.status === "pending");
  const confirmedBookings = filtered.filter((b) => b.status === "confirmed");
  const otherBookings = filtered.filter(
    (b) => !["pending", "confirmed"].includes(b.status)
  );

  // Create action handler that returns the appropriate actions for each booking
  const getActions = (booking: Booking) => (
    <BookingActions
      booking={booking}
      onUpdateStatus={updateBookingStatus}
      onDelete={deleteBooking}
      onShowDidShowModal={(booking) => {
        setModalBooking(booking);
        setShowDidShowModal(true);
      }}
      isUpdating={updateBookingStatusMutation.isPending}
    />
  );

  return (
    <div className="p-6">
      {/* Filters */}
      <AppointmentsFilters
        query={query}
        setQuery={setQuery}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        upcomingOnly={upcomingOnly}
        setUpcomingOnly={setUpcomingOnly}
      />

      {/* Appointments Sections */}
      <AppointmentsSection
        title="Pending Bookings"
        icon={ClockIcon}
        iconColor="text-yellow-600"
        bookings={pendingBookings}
        getActions={getActions}
        isUpdating={updateBookingStatusMutation.isPending}
      />

      <AppointmentsSection
        title="Confirmed Appointments"
        icon={CheckCircleIcon}
        iconColor="text-green-600"
        bookings={confirmedBookings}
        getActions={getActions}
        isUpdating={updateBookingStatusMutation.isPending}
      />

      <AppointmentsSection
        title="Other Appointments"
        icon={ClockIcon}
        iconColor="text-gray-600"
        bookings={otherBookings}
        getActions={getActions}
        isUpdating={updateBookingStatusMutation.isPending}
      />

      {/* Modals */}
      <DidShowModal
        isOpen={showDidShowModal}
        onClose={() => setShowDidShowModal(false)}
        booking={modalBooking}
        onMarkNoShow={async () => {
          if (!modalBooking) return;
          await updateBookingStatus(modalBooking.id, "no-show");
          setShowDidShowModal(false);
          setModalBooking(null);
        }}
        onMarkCompleted={async () => {
          if (!modalBooking) return;
          await updateBookingStatus(modalBooking.id, "completed");
          setShowDidShowModal(false);
          setModalBooking(null);
        }}
        isUpdating={updateBookingStatusMutation.isPending}
      />
    </div>
  );
}
