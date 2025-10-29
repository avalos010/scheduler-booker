import { format } from "date-fns";
import Link from "next/link";
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  LinkIcon,
} from "@heroicons/react/24/outline";
import type { Booking } from "@/lib/types/availability";

// Normalize YYYY-MM-DD dates to local timezone to avoid off-by-one when formatting
const toLocalDate = (dateStr: string) => new Date(`${dateStr}T00:00:00`);

interface BookingCardProps {
  booking: Booking;
  actions: React.ReactNode;
  updatingStatus: boolean;
}

export default function BookingCard({
  booking,
  actions,
  updatingStatus,
}: BookingCardProps) {
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
              {booking?.startTimeDisplay || booking.start_time} -{" "}
              {booking?.endTimeDisplay || booking.end_time}
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

          {/* Booking Details Link */}
          {booking.access_token && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <Link
                href={`/booking/${booking.access_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <LinkIcon className="h-4 w-4" />
                View Booking Details public link
              </Link>
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
