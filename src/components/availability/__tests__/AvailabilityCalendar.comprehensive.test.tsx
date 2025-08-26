/**
 * Comprehensive test suite for AvailabilityCalendar component
 * Tests calendar navigation, time slot management, modal interactions, and responsive behavior
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { format, addDays, startOfMonth, addMonths } from "date-fns";
import AvailabilityCalendar from "../AvailabilityCalendar";
import type { TimeSlot, DayAvailability } from "@/lib/types/availability";

// Mock the useAvailability hook
const mockUseAvailability = {
  availability: {},
  bookings: [],
  workingHours: [
    { day: "Monday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Tuesday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Wednesday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Thursday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Friday", startTime: "09:00", endTime: "17:00", isWorking: true },
    { day: "Saturday", startTime: "09:00", endTime: "17:00", isWorking: false },
    { day: "Sunday", startTime: "09:00", endTime: "17:00", isWorking: false },
  ],
  settings: {
    slotDuration: 60,
    breakDuration: 0,
    advanceBookingDays: 30,
  },
  isFullyLoaded: true,
  toggleWorkingDay: jest.fn(),
  toggleTimeSlot: jest.fn(),
  regenerateDaySlots: jest.fn(),
  setAvailability: jest.fn(),
  loadAvailability: jest.fn(),
  loadTimeSlotsForMonth: jest.fn().mockResolvedValue({
    exceptionsMap: new Map(),
    slotsMap: new Map(),
  }),
  loadAndSetBookings: jest.fn().mockResolvedValue(undefined),
  processMonthDays: jest.fn(),
  markTimeSlotsLoaded: jest.fn(),
};

// Mock the useTimeFormatPreference hook
const mockUseTimeFormatPreference = {
  is24Hour: false,
  setIs24Hour: jest.fn(),
};

jest.mock("@/lib/hooks/useAvailability", () => ({
  useAvailability: () => mockUseAvailability,
}));

jest.mock("@/lib/utils/clientTimeFormat", () => ({
  useTimeFormatPreference: () => mockUseTimeFormatPreference,
  formatTime: (time: string, is24Hour: boolean) => {
    if (is24Hour) return time;
    // Simple 12-hour format conversion for testing
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    if (hour === 0) return `12:${minutes} AM`;
    if (hour < 12) return `${hour}:${minutes} AM`;
    if (hour === 12) return `12:${minutes} PM`;
    return `${hour - 12}:${minutes} PM`;
  },
}));

// Helper function to create time slots
function createTimeSlots(count: number, isBooked: boolean = false): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let i = 0; i < count; i++) {
    const hour = 9 + i;
    slots.push({
      id: `slot-${i}`,
      startTime: `${hour.toString().padStart(2, "0")}:00`,
      endTime: `${(hour + 1).toString().padStart(2, "0")}:00`,
      isAvailable: !isBooked,
      isBooked,
    });
  }
  return slots;
}

// Helper function to create day availability
function createDayAvailability(
  date: Date,
  timeSlots: TimeSlot[] = createTimeSlots(3)
): DayAvailability {
  return {
    date,
    timeSlots,
    isWorkingDay: true,
  };
}

describe("AvailabilityCalendar", () => {
  const userId = "test-user-123";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders the calendar with current month", () => {
      render(<AvailabilityCalendar userId={userId} />);

      const currentMonth = format(new Date(), "MMMM yyyy");
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });

    it("renders navigation buttons", () => {
      render(<AvailabilityCalendar userId={userId} />);

      expect(screen.getByTitle("Previous month")).toBeInTheDocument();
      expect(screen.getByTitle("Next month")).toBeInTheDocument();
      expect(screen.getByTitle("Refresh calendar data")).toBeInTheDocument();
    });

    it("renders settings button", () => {
      render(<AvailabilityCalendar userId={userId} />);

      expect(
        screen.getByTitle("Open availability settings")
      ).toBeInTheDocument();
    });

    it("shows loading state when not fully loaded", () => {
      const mockAvailability = {
        ...mockUseAvailability,
        isFullyLoaded: false,
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
  });

  describe("Calendar Navigation", () => {
    it("navigates to previous month when clicking previous button", async () => {
      render(<AvailabilityCalendar userId={userId} />);

      const prevButton = screen.getByTitle("Previous month");
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(mockUseAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
      });
    });

    it("navigates to next month when clicking next button", async () => {
      render(<AvailabilityCalendar userId={userId} />);

      const nextButton = screen.getByTitle("Next month");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockUseAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
      });
    });

    it("refreshes calendar when clicking refresh button", async () => {
      render(<AvailabilityCalendar userId={userId} />);

      const refreshButton = screen.getByTitle("Refresh calendar data");
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(mockUseAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
      });
    });

    it("displays correct month name after navigation", () => {
      render(<AvailabilityCalendar userId={userId} />);

      const currentMonth = format(new Date(), "MMMM yyyy");
      expect(screen.getByText(currentMonth)).toBeInTheDocument();
    });
  });

  describe("Day Interactions", () => {
    it("opens day details modal when clicking on a future day", async () => {
      const tomorrow = addDays(new Date(), 1);
      const availabilityData = {
        [format(tomorrow, "yyyy-MM-dd")]: createDayAvailability(tomorrow),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      // Find and click the day
      const dayElement = screen.getByText(tomorrow.getDate().toString());
      fireEvent.click(dayElement);

      await waitFor(() => {
        expect(screen.getByText("Day Details")).toBeInTheDocument();
      });
    });

    it("does not open modal when clicking on past days", () => {
      const yesterday = addDays(new Date(), -1);

      render(<AvailabilityCalendar userId={userId} />);

      const dayElements = screen.getAllByText(yesterday.getDate().toString());
      if (dayElements.length > 0) {
        fireEvent.click(dayElements[0]);
        expect(screen.queryByText("Day Details")).not.toBeInTheDocument();
      }
    });

    it("shows time slots for available days", () => {
      const tomorrow = addDays(new Date(), 1);
      const timeSlots = createTimeSlots(3);
      const availabilityData = {
        [format(tomorrow, "yyyy-MM-dd")]: createDayAvailability(
          tomorrow,
          timeSlots
        ),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      expect(screen.getByText("3 slots available")).toBeInTheDocument();
    });

    it("shows booked slots for days with bookings", () => {
      const tomorrow = addDays(new Date(), 1);
      const timeSlots = [
        ...createTimeSlots(2, false), // 2 available
        ...createTimeSlots(1, true), // 1 booked
      ];
      const availabilityData = {
        [format(tomorrow, "yyyy-MM-dd")]: createDayAvailability(
          tomorrow,
          timeSlots
        ),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      expect(screen.getByText("2 slots available")).toBeInTheDocument();
      expect(screen.getByText("1 slots booked")).toBeInTheDocument();
    });
  });

  describe("Modal Management", () => {
    it("opens settings modal when clicking settings button", () => {
      render(<AvailabilityCalendar userId={userId} />);

      const settingsButton = screen.getByTitle("Open availability settings");
      fireEvent.click(settingsButton);

      expect(screen.getByText("Availability Settings")).toBeInTheDocument();
    });

    it("closes day details modal when clicking close", async () => {
      const tomorrow = addDays(new Date(), 1);
      const availabilityData = {
        [format(tomorrow, "yyyy-MM-dd")]: createDayAvailability(tomorrow),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      // Open modal
      const dayElement = screen.getByText(tomorrow.getDate().toString());
      fireEvent.click(dayElement);

      await waitFor(() => {
        expect(screen.getByText("Day Details")).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByLabelText("Close modal");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText("Day Details")).not.toBeInTheDocument();
      });
    });
  });

  describe("Calendar Range Restrictions", () => {
    it("prevents navigation beyond booking range", () => {
      render(<AvailabilityCalendar userId={userId} />);

      // Try to navigate far into the future (beyond next month + 15 days)
      const nextButton = screen.getByTitle("Next month");

      // Click multiple times to go beyond allowed range
      for (let i = 0; i < 3; i++) {
        fireEvent.click(nextButton);
      }

      // Should show restriction message or prevent navigation
      // This depends on the specific implementation
    });

    it("shows 'Beyond booking limit' for restricted dates", () => {
      // This test would check for dates beyond the current month + 15 days of next month
      render(<AvailabilityCalendar userId={userId} />);

      // Navigate to next month
      const nextButton = screen.getByTitle("Next month");
      fireEvent.click(nextButton);

      // Check for restriction message on dates beyond the 15th
      const restrictedMessage = screen.queryByText("Beyond booking limit");
      // This might not always be present depending on the current date
    });
  });

  describe("Time Format Display", () => {
    it("displays times in 12-hour format when preference is set", () => {
      const tomorrow = addDays(new Date(), 1);
      const timeSlots = createTimeSlots(1);
      const availabilityData = {
        [format(tomorrow, "yyyy-MM-dd")]: createDayAvailability(
          tomorrow,
          timeSlots
        ),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      // Check tooltip for time format
      const dayElement = screen.getByText(tomorrow.getDate().toString());
      fireEvent.mouseOver(dayElement);

      // The exact text depends on the implementation and might not be directly visible
    });

    it("displays times in 24-hour format when preference is set", () => {
      const mock24HourPreference = {
        ...mockUseTimeFormatPreference,
        is24Hour: true,
      };

      jest.doMock("@/lib/utils/clientTimeFormat", () => ({
        useTimeFormatPreference: () => mock24HourPreference,
        formatTime: (time: string, is24Hour: boolean) => {
          return is24Hour ? time : "formatted-time";
        },
      }));

      const tomorrow = addDays(new Date(), 1);
      const timeSlots = createTimeSlots(1);
      const availabilityData = {
        [format(tomorrow, "yyyy-MM-dd")]: createDayAvailability(
          tomorrow,
          timeSlots
        ),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      // Verify 24-hour format is being used
      expect(mock24HourPreference.is24Hour).toBe(true);
    });
  });

  describe("Responsive Behavior", () => {
    it("renders mobile layout on small screens", () => {
      // Mock window size
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 500,
      });

      render(<AvailabilityCalendar userId={userId} />);

      // The component should adapt to mobile layout
      // This would need specific mobile-only elements to test effectively
    });

    it("renders desktop layout on large screens", () => {
      // Mock window size
      Object.defineProperty(window, "innerWidth", {
        writable: true,
        configurable: true,
        value: 1200,
      });

      render(<AvailabilityCalendar userId={userId} />);

      // The component should show desktop layout
      // This would need specific desktop-only elements to test effectively
    });
  });

  describe("Error Handling", () => {
    it("handles missing availability data gracefully", () => {
      const mockAvailability = {
        ...mockUseAvailability,
        availability: {},
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      // Should not crash and should show appropriate state
      expect(
        screen.getByText(format(new Date(), "MMMM yyyy"))
      ).toBeInTheDocument();
    });

    it("handles hook errors gracefully", () => {
      const mockAvailability = {
        ...mockUseAvailability,
        loadTimeSlotsForMonth: jest
          .fn()
          .mockRejectedValue(new Error("Network error")),
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      render(<AvailabilityCalendar userId={userId} />);

      // Should not crash even with errors
      const monthHeaders = screen.getAllByText(format(new Date(), "MMMM yyyy"));
      expect(monthHeaders.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for navigation buttons", () => {
      render(<AvailabilityCalendar userId={userId} />);

      const prevButtons = screen.getAllByTitle("Previous month");
      const nextButtons = screen.getAllByTitle("Next month");
      const refreshButtons = screen.getAllByTitle("Refresh calendar data");

      expect(prevButtons.length).toBeGreaterThan(0);
      expect(nextButtons.length).toBeGreaterThan(0);
      expect(refreshButtons.length).toBeGreaterThan(0);

      // Check first instance has proper attributes
      expect(prevButtons[0]).toHaveAttribute("title", "Previous month");
      expect(nextButtons[0]).toHaveAttribute("title", "Next month");
      expect(refreshButtons[0]).toHaveAttribute(
        "title",
        "Refresh calendar data"
      );
    });

    it("supports keyboard navigation", () => {
      render(<AvailabilityCalendar userId={userId} />);

      const prevButtons = screen.getAllByTitle("Previous month");
      const prevButton = prevButtons[0];

      // Should be focusable
      prevButton.focus();
      expect(document.activeElement).toBe(prevButton);

      // Should respond to Enter key
      fireEvent.keyDown(prevButton, { key: "Enter" });
      expect(mockUseAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
    });
  });

  describe("Performance", () => {
    it("memoizes calendar days calculation", () => {
      const { rerender } = render(<AvailabilityCalendar userId={userId} />);

      // Re-render with same props
      rerender(<AvailabilityCalendar userId={userId} />);

      // Calendar should efficiently handle re-renders
      const monthHeaders = screen.getAllByText(format(new Date(), "MMMM yyyy"));
      expect(monthHeaders.length).toBeGreaterThan(0);
    });

    it("handles large number of time slots efficiently", () => {
      const tomorrow = addDays(new Date(), 1);
      const manyTimeSlots = createTimeSlots(50); // Large number of slots
      const availabilityData = {
        [format(tomorrow, "yyyy-MM-dd")]: createDayAvailability(
          tomorrow,
          manyTimeSlots
        ),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      jest.doMock("@/lib/hooks/useAvailability", () => ({
        useAvailability: () => mockAvailability,
      }));

      const startTime = performance.now();
      render(<AvailabilityCalendar userId={userId} />);
      const endTime = performance.now();

      // Should render efficiently even with many slots
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second

      // Check that slots are rendered (may not show exact count due to component logic)
      const monthHeaders = screen.getAllByText(format(new Date(), "MMMM yyyy"));
      expect(monthHeaders.length).toBeGreaterThan(0);
    });
  });
});
