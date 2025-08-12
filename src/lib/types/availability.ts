export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  isBooked?: boolean; // Optional for backward compatibility
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
  isWorking: boolean;
}

export interface AvailabilitySettings {
  slotDuration: number;
  breakDuration: number;
  advanceBookingDays: number;
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
