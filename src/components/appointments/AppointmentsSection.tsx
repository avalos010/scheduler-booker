import type { ComponentType } from "react";
import BookingCard from "./BookingCard";
import type { Booking } from "@/lib/types/availability";

interface AppointmentsSectionProps {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  bookings: Booking[];
  getActions: (booking: Booking) => React.ReactNode;
  isUpdating: boolean;
}

export default function AppointmentsSection({
  title,
  icon: Icon,
  iconColor,
  bookings,
  getActions,
  isUpdating,
}: AppointmentsSectionProps) {
  if (bookings.length === 0) return null;

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon className={`h-5 w-5 ${iconColor}`} />
        {title} ({bookings.length})
      </h2>
      <div className="space-y-4">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            actions={getActions(booking)}
            updatingStatus={isUpdating}
          />
        ))}
      </div>
    </div>
  );
}
