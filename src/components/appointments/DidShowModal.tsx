import { format } from "date-fns";
import type { Booking } from "@/lib/types/availability";

interface DidShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking | null;
  onMarkNoShow: () => void;
  onMarkCompleted: () => void;
  isUpdating: boolean;
}

export default function DidShowModal({
  isOpen,
  onClose,
  booking,
  onMarkNoShow,
  onMarkCompleted,
  isUpdating,
}: DidShowModalProps) {
  if (!isOpen || !booking) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white shadow-xl border border-gray-200">
        <div className="p-5 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Did they show up?
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            {format(new Date(booking.date), "EEEE, MMMM d, yyyy")} ·{" "}
            {booking.startTimeDisplay || booking.start_time} -{" "}
            {booking.endTimeDisplay || booking.end_time}
          </p>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            Confirm whether the client attended this appointment.
          </p>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-gray-700 border border-gray-300 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={onMarkNoShow}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              No, mark No Show
            </button>
            <button
              onClick={onMarkCompleted}
              disabled={isUpdating}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              Yes, mark Completed
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
