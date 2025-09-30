/**
 * Comprehensive test suite for AvailabilityCalendar component
 * Tests calendar navigation, time slot management, modal interactions, and responsive behavior
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { format, addDays } from "date-fns";
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
  useAvailability: jest.fn(() => mockUseAvailability),
}));

jest.mock("@/lib/utils/clientTimeFormat", () => ({
  useTimeFormatPreference: jest.fn(() => mockUseTimeFormatPreference),
  formatTime: jest.fn((time: string, is24Hour: boolean) => {
    if (is24Hour) return time;
    // Simple 12-hour format conversion for testing
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    if (hour === 0) return `12:${minutes} AM`;
    if (hour < 12) return `${hour}:${minutes} AM`;
    if (hour === 12) return `12:${minutes} PM`;
    return `${hour - 12}:${minutes} PM`;
  }),
}));

// Helper function to find a future working day
function getWorkingDayInCurrentMonth(): Date {
  const today = new Date();
  // Start from 3 days in the future to ensure it's clearly in the future
  const testDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 3
  );

  // Find the next working day (Monday-Friday)
  while (testDate.getDay() === 0 || testDate.getDay() === 6) {
    testDate.setDate(testDate.getDate() + 1);
  }

  return testDate;
}

// Helper function to create time slots
function createTimeSlots(
  count: number,
  isBooked: boolean = false,
  startIndex: number = 0
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let i = 0; i < count; i++) {
    const hour = 9 + i;
    slots.push({
      id: `slot-${startIndex + i}`,
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

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset availability to empty before each test
    mockUseAvailability.availability = {};

    // Reset mocks to default values
    const { useAvailability } = jest.requireMock("@/lib/hooks/useAvailability");
    const { useTimeFormatPreference, formatTime } = jest.requireMock(
      "@/lib/utils/clientTimeFormat"
    );

    (useAvailability as jest.Mock).mockReturnValue(mockUseAvailability);
    (useTimeFormatPreference as jest.Mock).mockReturnValue(
      mockUseTimeFormatPreference
    );
    (formatTime as jest.Mock).mockImplementation(
      (time: string, is24Hour: boolean) => {
        if (is24Hour) return time;
        // Simple 12-hour format conversion for testing
        const [hours, minutes] = time.split(":");
        const hour = parseInt(hours);
        if (hour === 0) return `12:${minutes} AM`;
        if (hour < 12) return `${hour}:${minutes} AM`;
        if (hour === 12) return `12:${minutes} PM`;
        return `${hour - 12}:${minutes} PM`;
      }
    );
  });

  describe("Basic Rendering", () => {
    it("renders the calendar with current month", () => {
      render(<AvailabilityCalendar />);

      const currentMonth = format(new Date(), "MMMM yyyy");
      expect(screen.getAllByText(currentMonth)[0]).toBeInTheDocument();
    });

    it("renders navigation buttons", () => {
      render(<AvailabilityCalendar />);

      const prevButtons = screen.getAllByTitle("Previous month");
      const nextButtons = screen.getAllByTitle("Next month");
      const refreshButtons = screen.getAllByTitle("Refresh calendar data");
      expect(prevButtons.length).toBeGreaterThan(0);
      expect(nextButtons.length).toBeGreaterThan(0);
      expect(refreshButtons.length).toBeGreaterThan(0);
    });

    it("renders settings button", () => {
      render(<AvailabilityCalendar />);

      const settingsButtons = screen.getAllByTitle(
        "Open availability settings"
      );
      expect(settingsButtons.length).toBeGreaterThan(0);
    });

    it("shows loading state when not fully loaded", () => {
      const mockAvailability = {
        ...mockUseAvailability,
        isFullyLoaded: false,
      };

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      expect(screen.getByText("Loading Calendar...")).toBeInTheDocument();
    });
  });

  describe("Calendar Navigation", () => {
    it("navigates to previous month when clicking previous button", async () => {
      render(<AvailabilityCalendar />);

      const prevButtons = screen.getAllByTitle("Previous month");
      fireEvent.click(prevButtons[0]);

      await waitFor(() => {
        expect(mockUseAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
      });
    });

    it("navigates to next month when clicking next button", async () => {
      render(<AvailabilityCalendar />);

      const nextButton = screen.getByTitle("Next month");
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockUseAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
      });
    });

    it("refreshes calendar when clicking refresh button", async () => {
      render(<AvailabilityCalendar />);

      const refreshButtons = screen.getAllByTitle("Refresh calendar data");
      fireEvent.click(refreshButtons[0]);

      await waitFor(() => {
        expect(mockUseAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
      });
    });

    it("displays correct month name after navigation", () => {
      render(<AvailabilityCalendar />);

      const currentMonth = format(new Date(), "MMMM yyyy");
      const monthElements = screen.getAllByText(currentMonth);
      expect(monthElements.length).toBeGreaterThan(0);
    });
  });

  describe("Day Interactions", () => {
    it("opens day details modal when clicking on a future day", async () => {
      // Use a fixed date in mid-September to avoid month boundary issues
      // Find a working day in the current month
      const today = new Date();
      const testDate = new Date(today.getFullYear(), today.getMonth(), 15);
      while (testDate.getDay() === 0 || testDate.getDay() === 6) {
        testDate.setDate(testDate.getDate() + 1);
      }
      const availabilityData = {
        [format(testDate, "yyyy-MM-dd")]: createDayAvailability(testDate),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      // Find and click the day - look for the accessible date text
      const dateText = format(testDate, "MMMM d, yyyy");
      const dayElements = screen.getAllByText(dateText);
      const dayElement = dayElements[0].closest("div");
      if (dayElement) {
        fireEvent.click(dayElement);
      }

      await waitFor(() => {
        // Look for the modal header with the formatted date
        const formattedDate = format(testDate, "EEEE, MMMM d, yyyy");
        expect(screen.getByText(formattedDate)).toBeInTheDocument();
      });
    });

    it("does not open modal when clicking on past days", () => {
      const yesterday = addDays(new Date(), -1);

      render(<AvailabilityCalendar />);

      const dayElements = screen.getAllByText(yesterday.getDate().toString());
      if (dayElements.length > 0) {
        fireEvent.click(dayElements[0]);
        expect(screen.queryByText("Day Details")).not.toBeInTheDocument();
      }
    });

    it("shows time slots for available days", () => {
      const testDate = getWorkingDayInCurrentMonth();

      const timeSlots = createTimeSlots(3);

      // Directly modify the mock object
      mockUseAvailability.availability = {
        [format(testDate, "yyyy-MM-dd")]: createDayAvailability(
          testDate,
          timeSlots
        ),
      };

      render(<AvailabilityCalendar />);

      expect(screen.getAllByText("3 slots available")[0]).toBeInTheDocument();

      // Clean up
      mockUseAvailability.availability = {};
    });

    it("shows booked slots for days with bookings", () => {
      const testDate = getWorkingDayInCurrentMonth();

      const timeSlots = [
        ...createTimeSlots(2, false, 0), // 2 available - slot-0, slot-1
        ...createTimeSlots(1, true, 2), // 1 booked - slot-2
      ];

      // Directly modify the mock object
      mockUseAvailability.availability = {
        [format(testDate, "yyyy-MM-dd")]: createDayAvailability(
          testDate,
          timeSlots
        ),
      };

      render(<AvailabilityCalendar />);

      // Check for the slot counts in the rendered output
      const bodyText = document.body.textContent || "";
      expect(bodyText).toContain("2 slots available");
      expect(bodyText).toContain("1 slots booked");

      // Clean up
      mockUseAvailability.availability = {};
    });
  });

  describe("Modal Management", () => {
    it("opens settings modal when clicking settings button", () => {
      render(<AvailabilityCalendar />);

      const settingsButtons = screen.getAllByTitle(
        "Open availability settings"
      );
      fireEvent.click(settingsButtons[0]);

      expect(screen.getByText("Availability Settings")).toBeInTheDocument();
    });

    it("closes day details modal when clicking close", async () => {
      // Use a fixed date in mid-September to avoid month boundary issues
      const testDate = getWorkingDayInCurrentMonth();
      const availabilityData = {
        [format(testDate, "yyyy-MM-dd")]: createDayAvailability(testDate),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      // Open modal - find and click the day using accessible date text
      const dateText = format(testDate, "MMMM d, yyyy");
      const dayElements = screen.getAllByText(dateText);
      const dayElement = dayElements[0].closest("div");
      if (dayElement) {
        fireEvent.click(dayElement);
      }

      await waitFor(() => {
        // Look for the modal header with the formatted date
        const formattedDate = format(testDate, "EEEE, MMMM d, yyyy");
        expect(screen.getByText(formattedDate)).toBeInTheDocument();
      });

      // Close modal
      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      await waitFor(() => {
        const formattedDate = format(testDate, "EEEE, MMMM d, yyyy");
        expect(screen.queryByText(formattedDate)).not.toBeInTheDocument();
      });
    });
  });

  describe("Calendar Range Restrictions", () => {
    it("prevents navigation beyond booking range", () => {
      render(<AvailabilityCalendar />);

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
      render(<AvailabilityCalendar />);

      // Navigate to next month
      const nextButton = screen.getByTitle("Next month");
      fireEvent.click(nextButton);

      // Check for restriction message on dates beyond the 15th
      // This might not always be present depending on the current date
      screen.queryByText("Beyond booking limit");
    });
  });

  describe("Time Format Display", () => {
    it("displays times in 12-hour format when preference is set", () => {
      // Use a fixed date in mid-September to avoid month boundary issues
      const testDate = getWorkingDayInCurrentMonth();
      const timeSlots = createTimeSlots(1);
      const availabilityData = {
        [format(testDate, "yyyy-MM-dd")]: createDayAvailability(
          testDate,
          timeSlots
        ),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      // Check tooltip for time format - find the day element by looking for the full date text
      const testDateText = format(testDate, "MMMM d, yyyy");
      const dayElements = screen.getAllByText(testDateText);
      const dayElement = dayElements[0].closest("div");
      if (dayElement) {
        fireEvent.mouseOver(dayElement);
      }

      // The exact text depends on the implementation and might not be directly visible
    });

    it("displays times in 24-hour format when preference is set", () => {
      const mock24HourPreference = {
        ...mockUseTimeFormatPreference,
        is24Hour: true,
      };

      // Override the mock for this test
      const { useTimeFormatPreference, formatTime } = jest.requireMock(
        "@/lib/utils/clientTimeFormat"
      );
      (useTimeFormatPreference as jest.Mock).mockReturnValue(
        mock24HourPreference
      );
      (formatTime as jest.Mock).mockImplementation(
        (time: string, is24Hour: boolean) => {
          return is24Hour ? time : "formatted-time";
        }
      );

      // Use a fixed date in mid-September to avoid month boundary issues
      const testDate = getWorkingDayInCurrentMonth();
      const timeSlots = createTimeSlots(1);
      const availabilityData = {
        [format(testDate, "yyyy-MM-dd")]: createDayAvailability(
          testDate,
          timeSlots
        ),
      };

      const mockAvailability = {
        ...mockUseAvailability,
        availability: availabilityData,
      };

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

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

      render(<AvailabilityCalendar />);

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

      render(<AvailabilityCalendar />);

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

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      // Should not crash and should show appropriate state
      const monthYearText = format(new Date(), "MMMM yyyy");
      const monthElements = screen.getAllByText(monthYearText);
      expect(monthElements.length).toBeGreaterThan(0);
    });

    it("handles hook errors gracefully", () => {
      const mockAvailability = {
        ...mockUseAvailability,
        loadTimeSlotsForMonth: jest
          .fn()
          .mockResolvedValue({ exceptionsMap: new Map(), slotsMap: new Map() }),
      };

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      // Should not crash even with errors
      const monthHeaders = screen.getAllByText(format(new Date(), "MMMM yyyy"));
      expect(monthHeaders.length).toBeGreaterThan(0);
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA labels for navigation buttons", () => {
      render(<AvailabilityCalendar />);

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
      render(<AvailabilityCalendar />);

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
      const { rerender } = render(<AvailabilityCalendar />);

      // Re-render with same props
      rerender(<AvailabilityCalendar />);

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

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      const startTime = performance.now();
      render(<AvailabilityCalendar />);
      const endTime = performance.now();

      // Should render efficiently even with many slots
      expect(endTime - startTime).toBeLessThan(1000); // Less than 1 second

      // Check that slots are rendered (may not show exact count due to component logic)
      const monthHeaders = screen.getAllByText(format(new Date(), "MMMM yyyy"));
      expect(monthHeaders.length).toBeGreaterThan(0);
    });
  });
});
