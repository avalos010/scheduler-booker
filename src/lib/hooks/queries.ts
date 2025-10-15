import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  Booking,
  WorkingHours,
  AvailabilitySettings,
  DayAvailability,
  TimeSlot,
} from "../types/availability";

// Query Keys
export const queryKeys = {
  bookings: ["bookings"] as const,
  availability: {
    workingHours: ["availability", "workingHours"] as const,
    settings: ["availability", "settings"] as const,
    dayDetails: (date: string) => ["availability", "dayDetails", date] as const,
    exceptions: ["availability", "exceptions"] as const,
  },
  auth: {
    check: ["auth", "check"] as const,
    user: ["auth", "user"] as const,
  },
  user: {
    timeFormat: ["user", "timeFormat"] as const,
    onboarding: ["user", "onboarding"] as const,
  },
} as const;

// API Functions
const api = {
  // Bookings
  async fetchBookings(): Promise<{ bookings: Booking[] }> {
    const response = await fetch("/api/bookings");
    if (!response.ok) {
      throw new Error("Failed to fetch bookings");
    }
    return response.json();
  },

  async updateBookingStatus(bookingId: string, status: string): Promise<void> {
    const response = await fetch(`/api/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      throw new Error("Failed to update booking status");
    }
  },

  // Availability
  async fetchWorkingHours(): Promise<WorkingHours[]> {
    const response = await fetch("/api/availability/working-hours");
    if (!response.ok) {
      throw new Error("Failed to fetch working hours");
    }
    return response.json();
  },

  async fetchAvailabilitySettings(): Promise<AvailabilitySettings> {
    const response = await fetch("/api/availability/settings");
    if (!response.ok) {
      throw new Error("Failed to fetch availability settings");
    }
    return response.json();
  },

  async fetchDayDetails(date: string): Promise<{
    bookings: Booking[];
    timeSlots: TimeSlot[];
  }> {
    const response = await fetch(`/api/availability/day-details?date=${date}`);
    if (!response.ok) {
      throw new Error("Failed to fetch day details");
    }
    return response.json();
  },

  async fetchAvailabilityExceptions(): Promise<
    Record<string, { isWorkingDay: boolean; reason?: string }>
  > {
    const response = await fetch("/api/availability/exceptions");
    if (!response.ok) {
      throw new Error("Failed to fetch availability exceptions");
    }
    return response.json();
  },

  // Auth
  async checkAuth(): Promise<{ isAuthenticated: boolean }> {
    const response = await fetch("/api/auth/check");
    if (!response.ok) {
      return { isAuthenticated: false };
    }
    return { isAuthenticated: true };
  },

  async checkOnboarding(): Promise<{ isOnboarded: boolean }> {
    const response = await fetch("/api/user/onboarding");
    if (!response.ok) {
      return { isOnboarded: false };
    }
    const data = await response.json();
    return { isOnboarded: data.isOnboarded };
  },

  // Day availability for booking forms
  async fetchDayAvailability(date: string): Promise<{
    timeSlots: TimeSlot[];
    isWorkingDay: boolean;
  }> {
    const response = await fetch(`/api/availability/day-details?date=${date}`);
    if (!response.ok) {
      throw new Error("Failed to fetch day availability");
    }
    const data = await response.json();
    return {
      timeSlots: data.timeSlots || [],
      isWorkingDay: data.isWorkingDay || false,
    };
  },

  async fetchPublicDayAvailability(
    date: string,
    userId: string
  ): Promise<{
    timeSlots: TimeSlot[];
    isWorkingDay: boolean;
  }> {
    const response = await fetch(
      `/api/availability/public?date=${date}&userId=${userId}`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch public day availability");
    }
    return response.json();
  },

  // User preferences
  async fetchTimeFormat(): Promise<{ time_format_12h: boolean }> {
    const response = await fetch("/api/user/time-format");
    if (!response.ok) {
      throw new Error("Failed to fetch time format preference");
    }
    return response.json();
  },

  async updateTimeFormat(is12Hour: boolean): Promise<void> {
    const response = await fetch("/api/user/time-format", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ time_format_12h: is12Hour }),
    });
    if (!response.ok) {
      throw new Error("Failed to update time format preference");
    }
  },
};

// Custom Query Hooks

// Bookings
export function useBookings() {
  return useQuery({
    queryKey: queryKeys.bookings,
    queryFn: api.fetchBookings,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: string;
    }) => api.updateBookingStatus(bookingId, status),
    onSuccess: () => {
      // Invalidate and refetch bookings
      queryClient.invalidateQueries({ queryKey: queryKeys.bookings });
    },
  });
}

// Availability
export function useWorkingHours() {
  return useQuery({
    queryKey: queryKeys.availability.workingHours,
    queryFn: api.fetchWorkingHours,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAvailabilitySettings() {
  return useQuery({
    queryKey: queryKeys.availability.settings,
    queryFn: api.fetchAvailabilitySettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useDayDetails(date: string | null) {
  return useQuery({
    queryKey: queryKeys.availability.dayDetails(date || ""),
    queryFn: () => api.fetchDayDetails(date!),
    enabled: !!date,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useAvailabilityExceptions() {
  return useQuery({
    queryKey: queryKeys.availability.exceptions,
    queryFn: api.fetchAvailabilityExceptions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Auth
export function useAuthCheck() {
  return useQuery({
    queryKey: queryKeys.auth.check,
    queryFn: api.checkAuth,
    staleTime: 1 * 60 * 1000, // 1 minute
    retry: false, // Don't retry auth failures
  });
}

export function useOnboardingCheck() {
  return useQuery({
    queryKey: queryKeys.user.onboarding,
    queryFn: api.checkOnboarding,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}

// User preferences
export function useTimeFormat() {
  return useQuery({
    queryKey: queryKeys.user.timeFormat,
    queryFn: api.fetchTimeFormat,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateTimeFormat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (is12Hour: boolean) => api.updateTimeFormat(is12Hour),
    onSuccess: () => {
      // Update the cache immediately
      const currentData = queryClient.getQueryData(
        queryKeys.user.timeFormat
      ) as { time_format_12h: boolean } | undefined;
      queryClient.setQueryData(queryKeys.user.timeFormat, {
        time_format_12h: !currentData?.time_format_12h,
      });
      // Also invalidate to refetch from server
      queryClient.invalidateQueries({ queryKey: queryKeys.user.timeFormat });
    },
  });
}

// Day availability for booking forms
export function useDayAvailability(date: string | null) {
  return useQuery({
    queryKey: ["availability", "day", date],
    queryFn: () => api.fetchDayAvailability(date!),
    enabled: !!date,
    staleTime: 30 * 1000, // 30 seconds
  });
}

export function usePublicDayAvailability(
  date: string | null,
  userId: string | null
) {
  return useQuery({
    queryKey: ["availability", "public", "day", date, userId],
    queryFn: () => api.fetchPublicDayAvailability(date!, userId!),
    enabled: !!date && !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
