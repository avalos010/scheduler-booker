import { useRouter } from "next/navigation";
import {
  CheckCircleIcon,
  XCircleIcon,
  TrashIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";
import type { Booking } from "@/lib/types/availability";

interface BookingActionsProps {
  booking: Booking;
  onUpdateStatus: (bookingId: string, status: string) => void;
  onDelete: (bookingId: string) => void;
  onShowDidShowModal: (booking: Booking) => void;
  isUpdating: boolean;
}

export default function BookingActions({
  booking,
  onUpdateStatus,
  onDelete,
  onShowDidShowModal,
  isUpdating,
}: BookingActionsProps) {
  const router = useRouter();

  const handleRebook = (booking: Booking) => {
    // Navigate to dedicated rebook page
    router.push(`/dashboard/rebook/${booking.id}`);
  };
  switch (booking.status) {
    case "pending":
      return (
        <div className="flex gap-2">
          <button
            onClick={() => onUpdateStatus(booking.id, "confirmed")}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Accept
          </button>
          <button
            onClick={() => onUpdateStatus(booking.id, "cancelled")}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            <XCircleIcon className="h-4 w-4" />
            Decline
          </button>
          <button
            onClick={() => handleRebook(booking)}
            className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
            title="Rebook this appointment"
          >
            <CalendarIcon className="h-4 w-4" />
            Rebook
          </button>
          <button
            onClick={() => onDelete(booking.id)}
            disabled={isUpdating}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            title="Delete booking"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>
        </div>
      );
    case "confirmed": {
      // Create date more explicitly for Node 18 compatibility
      const startDateTime = new Date(
        `${booking.date}T${booking.start_time}:00`
      );
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
              onClick={() => onUpdateStatus(booking.id, "completed")}
              disabled={isUpdating || isBeforeStart}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircleIcon className="h-4 w-4" />
              Mark Complete
            </button>
            <button
              onClick={() => onUpdateStatus(booking.id, "no-show")}
              disabled={isUpdating || isBeforeGrace}
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
              onClick={() => handleRebook(booking)}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
              title="Rebook this appointment"
            >
              <CalendarIcon className="h-4 w-4" />
              Rebook
            </button>
            <button
              onClick={() => onDelete(booking.id)}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              title="Delete booking"
            >
              <TrashIcon className="h-4 w-4" />
              Delete
            </button>
          </div>
          {!isBeforeGrace && (
            <button
              onClick={() => onShowDidShowModal(booking)}
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
              onClick={() => handleRebook(booking)}
              className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
              title="Rebook this appointment"
            >
              <CalendarIcon className="h-4 w-4" />
              Rebook
            </button>
          )}
          <button
            onClick={() => onDelete(booking.id)}
            disabled={isUpdating}
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
}
