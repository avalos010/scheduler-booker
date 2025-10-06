export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  startTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
  endTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
  isAvailable: boolean;
  isBooked?: boolean; // Optional for backward compatibility
  bookingStatus?:
    | "pending"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "no-show"; // Optional for backward compatibility
  bookingDetails?: {
    clientName: string;
    clientEmail: string;
    notes?: string;
    status: string;
  }; // Optional for backward compatibility
}

export interface DayAvailability {
  date: Date;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

export interface WorkingHours {
  day: string;
  startTime: string;
  endTime: string;
  startTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
  endTimeDisplay?: string; // Formatted display time (when user prefers 12-hour format)
  isWorking: boolean;
}

export interface AvailabilitySettings {
  slotDuration: number;
  advanceBookingDays: number;
  timeFormat12h?: boolean;
}

export interface Booking {
  id: string;
  user_id: string;
  date: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  notes?: string;
  status: "pending" | "confirmed" | "cancelled" | "completed" | "no-show";
  created_at: string;
  updated_at: string;
}

export interface LoadingSteps {
  workingHours: boolean;
  settings: boolean;
  exceptions: boolean;
  timeSlots: boolean;
}

export interface CachedAvailabilityData {
  availability: Record<string, DayAvailability>;
  workingHours: WorkingHours[];
  settings: AvailabilitySettings;
  exceptions: Record<string, { isWorkingDay: boolean; reason?: string }>;
}
