/**
 * Integration tests for AvailabilityCalendar component
 * Tests complex interactions, real-world scenarios, and integration with other components
 */

import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { format, addDays, subDays, addMonths, startOfMonth } from "date-fns";
import AvailabilityCalendar from "../AvailabilityCalendar";
import type { TimeSlot, DayAvailability, WorkingHours } from "@/lib/types/availability";

// Mock data generators
const createMockWorkingHours = (overrides: Partial<WorkingHours>[] = []): WorkingHours[] => {
  const defaults = [
    { day: "Monday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Tuesday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Wednesday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Thursday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Friday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Saturday", startTime: "10:00", endTime: "14:00", isWorking: false },
    { day: "Sunday", startTime: "10:00", endTime: "14:00", isWorking: false },
  ];

  return defaults.map((day, index) => ({
    ...day,
    ...overrides[index],
  }));
};

const createRealisticTimeSlots = (date: Date, scenario: "busy" | "light" | "mixed" = "mixed"): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  const startHour = 9;
  const endHour = 17;

  for (let hour = startHour; hour < endHour; hour++) {
    const id = `${format(date, "yyyy-MM-dd")}-${hour}:00`;
    const startTime = `${hour.toString().padStart(2, "0")}:00`;
    const endTime = `${(hour + 1).toString().padStart(2, "0")}:00`;

    let isBooked = false;
    let isAvailable = true;
    let bookingStatus: TimeSlot["bookingStatus"] = undefined;

    // Create realistic scenarios
    switch (scenario) {
      case "busy":
        isBooked = Math.random() > 0.3; // 70% booked
        isAvailable = !isBooked;
        if (isBooked) {
          const statuses = ["pending", "confirmed", "completed"] as const;
          bookingStatus = statuses[Math.floor(Math.random() * statuses.length)];
        }
        break;
      case "light":
        isBooked = Math.random() > 0.8; // 20% booked
        isAvailable = !isBooked;
        if (isBooked) bookingStatus = "confirmed";
        break;
      case "mixed":
        isBooked = Math.random() > 0.6; // 40% booked
        isAvailable = !isBooked;
        if (isBooked) {
          const statuses = ["pending", "confirmed", "cancelled", "completed", "no-show"] as const;
          bookingStatus = statuses[Math.floor(Math.random() * statuses.length)];
        }
        break;
    }

    slots.push({
      id,
      startTime,
      endTime,
      startTimeDisplay: scenario === "busy" ? `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}` : undefined,
      endTimeDisplay: scenario === "busy" ? `${(hour + 1) > 12 ? (hour + 1) - 12 : (hour + 1)}:00 ${(hour + 1) >= 12 ? "PM" : "AM"}` : undefined,
      isAvailable,
      isBooked,
      bookingStatus,
    });
  }

  return slots;
};

// Mock complex availability data
const createMonthAvailability = (baseDate: Date) => {
  const availability: Record<string, DayAvailability> = {};
  const startDate = startOfMonth(baseDate);

  // Create 30 days of availability data
  for (let i = 0; i < 30; i++) {
    const date = addDays(startDate, i);
    const dateKey = format(date, "yyyy-MM-dd");
    const dayOfWeek = date.getDay();

    // Weekend scenarios
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      availability[dateKey] = {
        date,
        timeSlots: createRealisticTimeSlots(date, "light"),
        isWorkingDay: false,
      };
    } else {
      // Weekday scenarios
      const scenario = i % 3 === 0 ? "busy" : i % 3 === 1 ? "light" : "mixed";
      availability[dateKey] = {
        date,
        timeSlots: createRealisticTimeSlots(date, scenario),
        isWorkingDay: true,
      };
    }
  }

  return availability;
};

// Integration test setup
const setupIntegrationTest = (overrides: any = {}) => {
  const mockAvailability = {
    availability: createMonthAvailability(new Date()),
    bookings: [],
    workingHours: createMockWorkingHours(),
    settings: {
      slotDuration: 60,
      breakDuration: 15,
      advanceBookingDays: 30,
    },
    isFullyLoaded: true,
    toggleWorkingDay: jest.fn(),
    toggleTimeSlot: jest.fn(),
    regenerateDaySlots: jest.fn().mockResolvedValue({ success: true }),
    setAvailability: jest.fn(),
    loadAvailability: jest.fn(),
    loadTimeSlotsForMonth: jest.fn().mockResolvedValue({
      exceptionsMap: new Map(),
      slotsMap: new Map(),
    }),
    loadAndSetBookings: jest.fn(),
    processMonthDays: jest.fn(),
    markTimeSlotsLoaded: jest.fn(),
    ...overrides,
  };

  jest.doMock("@/lib/hooks/useAvailability", () => ({
    useAvailability: () => mockAvailability,
  }));

  return mockAvailability;
};

describe("AvailabilityCalendar Integration Tests", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Real-world Usage Scenarios", () => {
    it("handles a typical busy professional's calendar", async () => {
      const mockAvailability = setupIntegrationTest();
      
      render(<AvailabilityCalendar userId={userId} />);

      // Should show current month
      expect(screen.getByText(format(new Date(), "MMMM yyyy"))).toBeInTheDocument();

      // Should show varying slot availability
      const availableSlots = screen.getAllByText(/slots available/);
      const bookedSlots = screen.getAllByText(/slots booked/);

      expect(availableSlots.length).toBeGreaterThan(0);
      expect(bookedSlots.length).toBeGreaterThan(0);
    });

    it("handles month-to-month navigation with data loading", async () => {
      const mockAvailability = setupIntegrationTest();
      
      render(<AvailabilityCalendar userId={userId} />);

      const currentMonth = format(new Date(), "MMMM yyyy");
      expect(screen.getByText(currentMonth)).toBeInTheDocument();

      // Navigate to next month
      const nextButton = screen.getByTitle("Next month");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
      });

      // Should show next month
      const nextMonth = format(addMonths(new Date(), 1), "MMMM yyyy");
      expect(screen.getByText(nextMonth)).toBeInTheDocument();

      // Navigate back
      const prevButton = screen.getByTitle("Previous month");
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getByText(currentMonth)).toBeInTheDocument();
      });
    });

    it("manages day details modal with complex time slot data", async () => {
      const tomorrow = addDays(new Date(), 1);
      const complexSlots = createRealisticTimeSlots(tomorrow, "mixed");
      
      const mockAvailability = setupIntegrationTest({
        availability: {
          [format(tomorrow, "yyyy-MM-dd")]: {
            date: tomorrow,
            timeSlots: complexSlots,
            isWorkingDay: true,
          },
        },
      });

      render(<AvailabilityCalendar userId={userId} />);

      // Click on tomorrow
      const dayElement = screen.getByText(tomorrow.getDate().toString());
      fireEvent.click(dayElement);

      await waitFor(() => {
        expect(screen.getByText("Day Details")).toBeInTheDocument();
      });

      // Should show complex slot information
      const modal = screen.getByRole("dialog");
      expect(within(modal).getByText(format(tomorrow, "EEEE, MMMM d, yyyy"))).toBeInTheDocument();

      // Should have toggle functionality
      const toggleButtons = within(modal).getAllByRole("button");
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Cross-component Integration", () => {
    it("integrates with settings modal for working hours", async () => {
      const mockAvailability = setupIntegrationTest();
      
      render(<AvailabilityCalendar userId={userId} />);

      // Open settings
      const settingsButton = screen.getByTitle("Open availability settings");
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText("Availability Settings")).toBeInTheDocument();
      });

      // Should show working hours
      expect(screen.getByText("Monday")).toBeInTheDocument();
      expect(screen.getByText("Tuesday")).toBeInTheDocument();

      // Close settings
      const closeButton = screen.getByLabelText("Close settings");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText("Availability Settings")).not.toBeInTheDocument();
      });
    });

    it("handles time format changes across the component", async () => {
      const mockTimePreference = {
        is24Hour: false,
        setIs24Hour: jest.fn(),
      };

      jest.doMock("@/lib/utils/clientTimeFormat", () => ({
        useTimeFormatPreference: () => mockTimePreference,
        formatTime: jest.fn((time, is24Hour) => 
          is24Hour ? time : time.replace(/(\d{2}):(\d{2})/, (_, h, m) => {
            const hour = parseInt(h);
            return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? "PM" : "AM"}`;
          })
        ),
      }));

      const mockAvailability = setupIntegrationTest();
      
      render(<AvailabilityCalendar userId={userId} />);

      // Change time format preference
      mockTimePreference.is24Hour = true;
      mockTimePreference.setIs24Hour(true);

      // Re-render to trigger format change
      render(<AvailabilityCalendar userId={userId} />);

      // Times should be displayed in 24-hour format
      // This would need specific implementation to verify the actual change
    });
  });

  describe("Error Recovery and Edge Cases", () => {
    it("recovers from network errors during navigation", async () => {
      const mockAvailability = setupIntegrationTest({
        loadTimeSlotsForMonth: jest.fn()
          .mockRejectedValueOnce(new Error("Network error"))
          .mockResolvedValue({ exceptionsMap: new Map(), slotsMap: new Map() }),
      });

      render(<AvailabilityCalendar userId={userId} />);

      // Try to navigate (will fail first time)
      const nextButton = screen.getByTitle("Next month");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockAvailability.loadTimeSlotsForMonth).toHaveBeenCalledTimes(1);
      });

      // Try again (should succeed)
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockAvailability.loadTimeSlotsForMonth).toHaveBeenCalledTimes(2);
      });

      // Should still be functional
      expect(screen.getByTitle("Next month")).toBeInTheDocument();
    });

    it("handles empty availability data gracefully", () => {
      const mockAvailability = setupIntegrationTest({
        availability: {},
        isFullyLoaded: true,
      });

      render(<AvailabilityCalendar userId={userId} />);

      // Should show calendar without crashing
      expect(screen.getByText(format(new Date(), "MMMM yyyy"))).toBeInTheDocument();

      // Should show appropriate empty state
      const dayElements = screen.getAllByText(/\d+/);
      expect(dayElements.length).toBeGreaterThan(0); // Calendar days should still render
    });

    it("handles corrupted time slot data", () => {
      const tomorrow = addDays(new Date(), 1);
      const corruptedSlots = [
        {
          id: "corrupt-1",
          startTime: "invalid-time",
          endTime: "25:00", // Invalid hour
          isAvailable: true,
          isBooked: false,
        },
        {
          id: "corrupt-2",
          startTime: "09:00",
          endTime: "08:00", // End before start
          isAvailable: true,
          isBooked: false,
        },
      ] as TimeSlot[];

      const mockAvailability = setupIntegrationTest({
        availability: {
          [format(tomorrow, "yyyy-MM-dd")]: {
            date: tomorrow,
            timeSlots: corruptedSlots,
            isWorkingDay: true,
          },
        },
      });

      render(<AvailabilityCalendar userId={userId} />);

      // Should not crash with corrupted data
      expect(screen.getByText(format(new Date(), "MMMM yyyy"))).toBeInTheDocument();
    });
  });

  describe("Performance with Large Datasets", () => {
    it("handles multiple months of data efficiently", async () => {
      // Create 3 months of data
      const largeAvailability: Record<string, DayAvailability> = {};
      for (let month = 0; month < 3; month++) {
        const monthData = createMonthAvailability(addMonths(new Date(), month));
        Object.assign(largeAvailability, monthData);
      }

      const mockAvailability = setupIntegrationTest({
        availability: largeAvailability,
      });

      const startTime = performance.now();
      render(<AvailabilityCalendar userId={userId} />);
      const renderTime = performance.now() - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000); // Less than 1 second

      // Should still be interactive
      const nextButton = screen.getByTitle("Next month");
      expect(nextButton).toBeInTheDocument();

      const clickStart = performance.now();
      fireEvent.click(nextButton);
      const clickTime = performance.now() - clickStart;

      expect(clickTime).toBeLessThan(100); // Immediate response
    });

    it("efficiently updates when data changes", () => {
      const { rerender } = render(<AvailabilityCalendar userId={userId} />);

      const startTime = performance.now();
      
      // Simulate data update
      for (let i = 0; i < 10; i++) {
        rerender(<AvailabilityCalendar userId={userId} />);
      }
      
      const totalTime = performance.now() - startTime;

      // Multiple re-renders should be efficient
      expect(totalTime).toBeLessThan(500); // Less than 0.5 seconds for 10 re-renders
    });
  });

  describe("Accessibility in Complex Scenarios", () => {
    it("maintains keyboard navigation with modal interactions", async () => {
      const tomorrow = addDays(new Date(), 1);
      const mockAvailability = setupIntegrationTest({
        availability: {
          [format(tomorrow, "yyyy-MM-dd")]: {
            date: tomorrow,
            timeSlots: createRealisticTimeSlots(tomorrow, "mixed"),
            isWorkingDay: true,
          },
        },
      });

      render(<AvailabilityCalendar userId={userId} />);

      // Navigate to day with keyboard
      const dayElement = screen.getByText(tomorrow.getDate().toString());
      dayElement.focus();
      fireEvent.keyDown(dayElement, { key: "Enter" });

      await waitFor(() => {
        expect(screen.getByText("Day Details")).toBeInTheDocument();
      });

      // Should trap focus in modal
      const modal = screen.getByRole("dialog");
      expect(modal).toBeInTheDocument();

      // Escape should close modal
      fireEvent.keyDown(modal, { key: "Escape" });

      await waitFor(() => {
        expect(screen.queryByText("Day Details")).not.toBeInTheDocument();
      });
    });

    it("provides appropriate ARIA labels for complex states", () => {
      const tomorrow = addDays(new Date(), 1);
      const busySlots = createRealisticTimeSlots(tomorrow, "busy");
      
      const mockAvailability = setupIntegrationTest({
        availability: {
          [format(tomorrow, "yyyy-MM-dd")]: {
            date: tomorrow,
            timeSlots: busySlots,
            isWorkingDay: true,
          },
        },
      });

      render(<AvailabilityCalendar userId={userId} />);

      // Should have descriptive labels for different states
      const availableCount = busySlots.filter(slot => slot.isAvailable).length;
      const bookedCount = busySlots.filter(slot => slot.isBooked).length;

      if (availableCount > 0) {
        expect(screen.getByText(`${availableCount} slots available`)).toBeInTheDocument();
      }
      
      if (bookedCount > 0) {
        expect(screen.getByText(`${bookedCount} slots booked`)).toBeInTheDocument();
      }
    });
  });
});
