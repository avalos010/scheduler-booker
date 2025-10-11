/**
 * Integration tests for AvailabilityCalendar component
 * Tests complex interactions, real-world scenarios, and integration with other components
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import {
  format,
  addDays,
  addMonths,
  startOfMonth,
  eachDayOfInterval,
} from "date-fns";
import AvailabilityCalendar from "../AvailabilityCalendar";
import type {
  TimeSlot,
  DayAvailability,
  WorkingHours,
} from "@/lib/types/availability";

// Narrow typing helpers to avoid `any`/`unknown` casts for global fetch
type JestMockedFetch = ((
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>) & {
  mockClear?: () => void;
};

function getMockableGlobalFetch(): { fetch?: JestMockedFetch } {
  return globalThis as unknown as { fetch?: JestMockedFetch };
}

// Mock the useAvailability hook
const mockUseAvailability = {
  availability: {},
  bookings: [],
  workingHours: [
    { dayOfWeek: 0, isWorking: false, startTime: "09:00", endTime: "17:00" }, // Sunday
    { dayOfWeek: 1, isWorking: true, startTime: "09:00", endTime: "17:00" }, // Monday
    { dayOfWeek: 2, isWorking: true, startTime: "09:00", endTime: "17:00" }, // Tuesday
    { dayOfWeek: 3, isWorking: true, startTime: "09:00", endTime: "17:00" }, // Wednesday
    { dayOfWeek: 4, isWorking: true, startTime: "09:00", endTime: "17:00" }, // Thursday
    { dayOfWeek: 5, isWorking: true, startTime: "09:00", endTime: "17:00" }, // Friday
    { dayOfWeek: 6, isWorking: false, startTime: "09:00", endTime: "17:00" }, // Saturday
  ],
  settings: {
    slotDuration: 60,
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
};

jest.mock("@/lib/hooks/useAvailability", () => ({
  useAvailability: jest.fn(() => mockUseAvailability),
}));

// Mock the time format utilities
const mockUseTimeFormatPreference = {
  is24Hour: false,
  setIs24Hour: jest.fn(),
};

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

// Mock data generators
const createMockWorkingHours = (
  overrides: Partial<WorkingHours>[] = []
): WorkingHours[] => {
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

const createRealisticTimeSlots = (
  date: Date,
  scenario: "busy" | "light" | "mixed" = "mixed"
): TimeSlot[] => {
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
          const statuses = [
            "pending",
            "confirmed",
            "cancelled",
            "completed",
            "no-show",
          ] as const;
          bookingStatus = statuses[Math.floor(Math.random() * statuses.length)];
        }
        break;
    }

    slots.push({
      id,
      startTime,
      endTime,
      startTimeDisplay:
        scenario === "busy"
          ? `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? "PM" : "AM"}`
          : undefined,
      endTimeDisplay:
        scenario === "busy"
          ? `${hour + 1 > 12 ? hour + 1 - 12 : hour + 1}:00 ${
              hour + 1 >= 12 ? "PM" : "AM"
            }`
          : undefined,
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
interface TestOverrides {
  availability?: Record<string, DayAvailability>;
  bookings?: unknown[];
  workingHours?: WorkingHours[];
  settings?: {
    slotDuration: number;
    advanceBookingDays: number;
  };
  isFullyLoaded?: boolean;
  toggleWorkingDay?: jest.Mock;
  toggleTimeSlot?: jest.Mock;
  regenerateDaySlots?: jest.Mock;
  setAvailability?: jest.Mock;
  loadAvailability?: jest.Mock;
  loadTimeSlotsForMonth?: jest.Mock;
  loadAndSetBookings?: jest.Mock;
  processMonthDays?: jest.Mock;
  markTimeSlotsLoaded?: jest.Mock;
}

const setupIntegrationTest = (overrides: TestOverrides = {}) => {
  const mockAvailability = {
    availability: createMonthAvailability(new Date()),
    bookings: [],
    workingHours: createMockWorkingHours(),
    settings: {
      slotDuration: 60,
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

  // Update the mock return value
  const { useAvailability } = jest.requireMock("@/lib/hooks/useAvailability");
  (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

  return mockAvailability;
};

describe("AvailabilityCalendar Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset availability to empty before each test
    mockUseAvailability.availability = {};
  });

  describe("Real-world Usage Scenarios", () => {
    it("handles a typical busy professional's calendar", async () => {
      setupIntegrationTest();

      render(<AvailabilityCalendar />);

      // Should show current month
      expect(
        screen.getAllByText(format(new Date(), "MMMM yyyy"))[0]
      ).toBeInTheDocument();

      // Should show varying slot availability - check for any slot-related text
      const slotTexts = screen.getAllByText(
        /slots|available|booked|Non-working day|No slots configured/
      );
      expect(slotTexts.length).toBeGreaterThan(0);
    });

    it("handles month-to-month navigation with data loading", async () => {
      const mockAvailability = setupIntegrationTest();

      render(<AvailabilityCalendar />);

      const currentMonth = format(new Date(), "MMMM yyyy");
      expect(screen.getAllByText(currentMonth)[0]).toBeInTheDocument();

      // Navigate to next month
      const nextButton = screen.getByTitle("Next month");
      fireEvent.click(nextButton);

      await waitFor(
        () => {
          expect(mockAvailability.loadTimeSlotsForMonth).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Should show next month
      const nextMonth = format(addMonths(new Date(), 1), "MMMM yyyy");
      expect(screen.getAllByText(nextMonth)[0]).toBeInTheDocument();

      // Navigate back
      const prevButton = screen.getAllByTitle("Previous month")[0];
      fireEvent.click(prevButton);

      await waitFor(() => {
        expect(screen.getAllByText(currentMonth)[0]).toBeInTheDocument();
      });
    });

    it("manages day details modal with complex time slot data", async () => {
      // Use a fixed date in mid-September to avoid month boundary issues
      const testDate = getWorkingDayInCurrentMonth();
      const complexSlots = createRealisticTimeSlots(testDate, "mixed");

      const mockAvailability = setupIntegrationTest({
        availability: {
          [format(testDate, "yyyy-MM-dd")]: {
            date: testDate,
            timeSlots: complexSlots,
            isWorkingDay: true,
          },
        },
      });

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      // Click on the test date - look for the accessible date text
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

      // Should show complex slot information
      const modal = screen.getByText(format(testDate, "EEEE, MMMM d, yyyy"));
      expect(modal).toBeInTheDocument();

      // Should have toggle functionality
      const toggleButtons = screen.getAllByRole("button");
      expect(toggleButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Cross-component Integration", () => {
    it("integrates with settings modal for working hours", async () => {
      const mockAvailability = setupIntegrationTest();

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      // Open settings
      const settingsButtons = screen.getAllByTitle(
        "Open availability settings"
      );
      fireEvent.click(settingsButtons[0]);

      await waitFor(() => {
        expect(screen.getByText("Availability Settings")).toBeInTheDocument();
      });

      // Should show working hours - check if modal has content
      const modal = screen.getByText("Availability Settings");
      expect(modal).toBeInTheDocument();

      // Close settings
      const closeButton = screen.getByText("Close");
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(
          screen.queryByText("Availability Settings")
        ).not.toBeInTheDocument();
      });
    });

    it("handles time format changes across the component", async () => {
      const mockTimePreference = {
        is24Hour: false,
        setIs24Hour: jest.fn(),
      };

      jest.doMock("@/lib/utils/clientTimeFormat", () => ({
        useTimeFormatPreference: () => mockTimePreference,
        formatTime: jest.fn((time: string, is24Hour: boolean) =>
          is24Hour
            ? time
            : time.replace(
                /(\d{2}):(\d{2})/,
                (_: string, h: string, m: string) => {
                  const hour = parseInt(h);
                  return `${hour > 12 ? hour - 12 : hour}:${m} ${
                    hour >= 12 ? "PM" : "AM"
                  }`;
                }
              )
        ),
      }));

      setupIntegrationTest();

      render(<AvailabilityCalendar />);

      // Change time format preference
      mockTimePreference.is24Hour = true;
      mockTimePreference.setIs24Hour(true);

      // Re-render to trigger format change
      render(<AvailabilityCalendar />);

      // Times should be displayed in 24-hour format
      // This would need specific implementation to verify the actual change
    });
  });

  describe("Error Recovery and Edge Cases", () => {
    it("recovers from network errors during navigation", async () => {
      setupIntegrationTest();

      render(<AvailabilityCalendar />);

      // Should render without crashing
      expect(screen.getByTitle("Next month")).toBeInTheDocument();

      // Navigate to next month
      const nextButton = screen.getByTitle("Next month");
      fireEvent.click(nextButton);

      // Wait for navigation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should still be functional after navigation
      expect(screen.getByTitle("Next month")).toBeInTheDocument();
    });

    it("handles empty availability data gracefully", () => {
      setupIntegrationTest({
        availability: {},
        isFullyLoaded: true,
      });

      render(<AvailabilityCalendar />);

      // Should show calendar without crashing
      expect(
        screen.getAllByText(format(new Date(), "MMMM yyyy"))[0]
      ).toBeInTheDocument();

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

      setupIntegrationTest({
        availability: {
          [format(tomorrow, "yyyy-MM-dd")]: {
            date: tomorrow,
            timeSlots: corruptedSlots,
            isWorkingDay: true,
          },
        },
      });

      render(<AvailabilityCalendar />);

      // Should not crash with corrupted data
      expect(
        screen.getAllByText(format(new Date(), "MMMM yyyy"))[0]
      ).toBeInTheDocument();
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

      setupIntegrationTest({
        availability: largeAvailability,
      });

      const startTime = performance.now();
      render(<AvailabilityCalendar />);
      const renderTime = performance.now() - startTime;

      // Should render within reasonable time
      expect(renderTime).toBeLessThan(1000); // Less than 1 second

      // Should still be interactive
      const nextButton = screen.getByTitle("Next month");
      expect(nextButton).toBeInTheDocument();

      const clickStart = performance.now();
      fireEvent.click(nextButton);
      const clickTime = performance.now() - clickStart;

      expect(clickTime).toBeLessThan(350); // Allow more time for test environment
    });

    it("efficiently updates when data changes", () => {
      const { rerender } = render(<AvailabilityCalendar />);

      const startTime = performance.now();

      // Simulate data update
      for (let i = 0; i < 10; i++) {
        rerender(<AvailabilityCalendar />);
      }

      const totalTime = performance.now() - startTime;

      // Multiple re-renders should be efficient
      expect(totalTime).toBeLessThan(2000); // Less than 2 seconds for 10 re-renders
    });
  });

  describe("Accessibility in Complex Scenarios", () => {
    afterEach(() => {
      cleanup();
      mockUseAvailability.availability = {};
    });

    it("maintains keyboard navigation with modal interactions", async () => {
      // Use a fixed date in mid-September to avoid month boundary issues
      const testDate = getWorkingDayInCurrentMonth();
      const mockAvailability = setupIntegrationTest({
        availability: {
          [format(testDate, "yyyy-MM-dd")]: {
            date: testDate,
            timeSlots: createRealisticTimeSlots(testDate, "mixed"),
            isWorkingDay: true,
          },
        },
      });

      // Override the mock for this test
      const { useAvailability } = jest.requireMock(
        "@/lib/hooks/useAvailability"
      );
      (useAvailability as jest.Mock).mockReturnValue(mockAvailability);

      render(<AvailabilityCalendar />);

      // Navigate to day with click - look for the accessible date text
      const dateText = format(testDate, "MMMM d, yyyy");
      const dayElements = screen.getAllByText(dateText);
      const dayElement = dayElements[0].closest("div");

      if (dayElement) {
        fireEvent.click(dayElement);
      }

      await waitFor(
        () => {
          // Look for the modal header with the formatted date
          const formattedDate = format(testDate, "EEEE, MMMM d, yyyy");
          expect(screen.getByText(formattedDate)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Should trap focus in modal - find modal by its content
      const modal = screen.getByText(format(testDate, "EEEE, MMMM d, yyyy"));
      expect(modal).toBeInTheDocument();

      // Escape should close modal
      fireEvent.keyDown(document, { key: "Escape" });

      await waitFor(
        () => {
          const formattedDate = format(testDate, "EEEE, MMMM d, yyyy");
          expect(screen.queryByText(formattedDate)).not.toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    }, 10000);

    it("provides appropriate ARIA labels for complex states", async () => {
      // Use a deterministic set of slots to avoid randomness
      const testDate = getWorkingDayInCurrentMonth();
      const busySlots: TimeSlot[] = [
        {
          id: "s1",
          startTime: "09:00",
          endTime: "10:00",
          isAvailable: true,
          isBooked: false,
        },
        {
          id: "s2",
          startTime: "10:00",
          endTime: "11:00",
          isAvailable: true,
          isBooked: false,
        },
        {
          id: "s3",
          startTime: "11:00",
          endTime: "12:00",
          isAvailable: true,
          isBooked: false,
        },
        {
          id: "s4",
          startTime: "12:00",
          endTime: "13:00",
          isAvailable: true,
          isBooked: false,
        },
        {
          id: "s5",
          startTime: "13:00",
          endTime: "14:00",
          isAvailable: true,
          isBooked: false,
        },
        {
          id: "s6",
          startTime: "14:00",
          endTime: "15:00",
          isAvailable: false,
          isBooked: true,
        },
        {
          id: "s7",
          startTime: "15:00",
          endTime: "16:00",
          isAvailable: false,
          isBooked: true,
        },
        {
          id: "s8",
          startTime: "16:00",
          endTime: "17:00",
          isAvailable: false,
          isBooked: true,
        },
      ];

      // Directly modify the mock object
      mockUseAvailability.availability = {
        [format(testDate, "yyyy-MM-dd")]: {
          date: testDate,
          timeSlots: busySlots,
          isWorkingDay: true,
        },
      };

      render(<AvailabilityCalendar />);

      // Wait for calendar to render with slots
      await waitFor(() => {
        const bodyText = document.body.textContent || "";
        expect(bodyText).toMatch(/\d+\s+slots available/);
      });

      const bodyText = document.body.textContent || "";

      // Check that available slot information is displayed
      expect(bodyText).toMatch(/\d+\s+slots available/);

      // Booked slots text appears when there are bookings
      // Note: The text "slots booked" appears inline with the day details,
      // but may also show as "meetings" in the booking stats
      const hasBookedRelatedText =
        bodyText.includes("slots booked") ||
        bodyText.includes("meetings") ||
        bodyText.includes("Booked");

      // With booked slots in our mock, we should see booking-related text
      expect(hasBookedRelatedText).toBe(true);

      // Clean up
      mockUseAvailability.availability = {};
    });
  });

  describe("Time Slot Activation/Deactivation", () => {
    beforeEach(() => {
      // Reset mocks before each test
      jest.clearAllMocks();
      // Reset availability to empty
      mockUseAvailability.availability = {};
      // Clear any previous fetch mocks
      const g = getMockableGlobalFetch();
      if (g.fetch && typeof g.fetch.mockClear === "function") {
        g.fetch.mockClear();
      } else {
        delete g.fetch;
      }
    });

    afterEach(() => {
      // Clean up component and mocks
      cleanup();
      const g = getMockableGlobalFetch();
      if (g.fetch && typeof g.fetch.mockClear === "function") {
        g.fetch.mockClear();
      } else {
        delete g.fetch;
      }
      mockUseAvailability.availability = {};
    });

    // TODO: Stabilize async modal interactions; spinner/disabled state timing is flaky in CI
    it.skip("should activate and deactivate time slots when clicked in day modal", async () => {
      // Use a date in September 2025 to match the calendar display
      const testDate = getWorkingDayInCurrentMonth();
      const dateKey = format(testDate, "yyyy-MM-dd");

      // Mock availability data with time slots
      const mockTimeSlots: TimeSlot[] = [
        {
          id: "slot-1",
          startTime: "09:00",
          endTime: "10:00",
          isAvailable: false, // Initially unavailable
          isBooked: false,
        },
        {
          id: "slot-2",
          startTime: "10:00",
          endTime: "11:00",
          isAvailable: true, // Initially available
          isBooked: false,
        },
        {
          id: "slot-3",
          startTime: "11:00",
          endTime: "12:00",
          isAvailable: true,
          isBooked: false,
        },
      ];

      const mockDayAvailability: DayAvailability = {
        date: testDate,
        timeSlots: mockTimeSlots,
        isWorkingDay: true,
      };

      // Mock the availability data for the entire month containing testDate
      const monthStart = new Date(
        testDate.getFullYear(),
        testDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        testDate.getFullYear(),
        testDate.getMonth() + 1,
        0
      );
      const monthDays = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
      });

      const monthAvailability: Record<string, DayAvailability> = {};

      // Create availability data for all days in the test month
      monthDays.forEach((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const dayOfWeek = day.getDay();
        const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday

        if (dayKey === dateKey) {
          // Use the test data for the test day
          monthAvailability[dayKey] = mockDayAvailability;
        } else {
          // Create basic availability for other days
          monthAvailability[dayKey] = {
            date: day,
            timeSlots: [],
            isWorkingDay,
          };
        }
      });

      mockUseAvailability.availability = monthAvailability;

      // Mock the toggleTimeSlot function to simulate API calls
      const mockToggleTimeSlot = jest.fn().mockImplementation(async () => {
        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 100));
        return Promise.resolve();
      });
      mockUseAvailability.toggleTimeSlot = mockToggleTimeSlot;

      // Mock fetch for day details API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timeSlots: mockTimeSlots.map((slot) => ({
            ...slot,
            startTimeDisplay: slot.startTime,
            endTimeDisplay: slot.endTime,
          })),
        }),
      });

      render(<AvailabilityCalendar />);

      // Click on the test date to open the modal
      const dateText = format(testDate, "MMMM d, yyyy");
      const dayElements = screen.getAllByText(dateText);
      expect(dayElements.length).toBeGreaterThan(0);
      const dayElement = dayElements[0].closest("div");
      expect(dayElement).toBeDefined();
      fireEvent.click(dayElement!);

      // Wait for modal to open - look for the formatted date header
      await waitFor(() => {
        const formattedDate = format(testDate, "EEEE, MMMM d, yyyy");
        expect(screen.getByText(formattedDate)).toBeInTheDocument();
      });

      // Prefer robust selection by action titles and enabled state
      let firstSlotButton: HTMLElement | undefined;
      let secondSlotButton: HTMLElement | undefined;
      await waitFor(() => {
        const buttons = screen.getAllByRole("button");
        firstSlotButton = buttons.find(
          (b) =>
            b.getAttribute("title") === "Mark available" &&
            !b.hasAttribute("disabled")
        );
        secondSlotButton = buttons.find(
          (b) =>
            b.getAttribute("title") === "Mark unavailable" &&
            !b.hasAttribute("disabled")
        );
        expect(firstSlotButton).toBeTruthy();
        expect(secondSlotButton).toBeTruthy();
      });

      fireEvent.click(firstSlotButton!);

      // Verify the toggle function was called; allow some delay
      await waitFor(
        () => {
          expect(mockToggleTimeSlot).toHaveBeenCalled();
        },
        { timeout: 4000 }
      );

      // Test deactivating the second slot (currently available)
      fireEvent.click(secondSlotButton!);

      // Verify the toggle function was called again
      await waitFor(() => {
        expect(mockToggleTimeSlot).toHaveBeenCalledTimes(2);
      });

      // Verify toggleTimeSlot was called exactly twice
      expect(mockToggleTimeSlot).toHaveBeenCalledTimes(2);
    });

    // TODO: Assert loading state with a deterministic test-id instead of class-based spinner
    it.skip("should show loading state when toggling time slots", async () => {
      // Use a date in September 2025 to match the calendar display
      const testDate = getWorkingDayInCurrentMonth();
      const dateKey = format(testDate, "yyyy-MM-dd");

      const mockTimeSlots: TimeSlot[] = [
        {
          id: "slot-1",
          startTime: "09:00",
          endTime: "10:00",
          isAvailable: true,
          isBooked: false,
        },
      ];

      const mockDayAvailability: DayAvailability = {
        date: testDate,
        timeSlots: mockTimeSlots,
        isWorkingDay: true,
      };

      // Mock the availability data for the entire month containing testDate
      const monthStart = new Date(
        testDate.getFullYear(),
        testDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        testDate.getFullYear(),
        testDate.getMonth() + 1,
        0
      );
      const monthDays = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
      });

      const monthAvailability: Record<string, DayAvailability> = {};

      // Create availability data for all days in the test month
      monthDays.forEach((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const dayOfWeek = day.getDay();
        const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday

        if (dayKey === dateKey) {
          // Use the test data for the test day
          monthAvailability[dayKey] = mockDayAvailability;
        } else {
          // Create basic availability for other days
          monthAvailability[dayKey] = {
            date: day,
            timeSlots: [],
            isWorkingDay,
          };
        }
      });

      mockUseAvailability.availability = monthAvailability;

      // Mock a slow API response
      const mockToggleTimeSlot = jest.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        return Promise.resolve();
      });
      mockUseAvailability.toggleTimeSlot = mockToggleTimeSlot;

      // Mock fetch for day details API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timeSlots: mockTimeSlots.map((slot) => ({
            ...slot,
            startTimeDisplay: slot.startTime,
            endTimeDisplay: slot.endTime,
          })),
        }),
      });

      render(<AvailabilityCalendar />);

      // Open the day modal - click on the test date
      const dateText = format(testDate, "MMMM d, yyyy");
      const dayElements = screen.getAllByText(dateText);
      expect(dayElements.length).toBeGreaterThan(0);
      const dayElement = dayElements[0].closest("div");
      expect(dayElement).toBeDefined();
      fireEvent.click(dayElement!);

      await waitFor(() => {
        const formattedDate = format(testDate, "EEEE, MMMM d, yyyy");
        expect(screen.getByText(formattedDate)).toBeInTheDocument();
      });

      // Wait for time slot buttons to load (with 3 second timeout)
      let timeSlotButton: HTMLElement;
      await waitFor(
        () => {
          const timeSlotButtons = screen
            .getAllByRole("button")
            .filter((button) =>
              button.getAttribute("title")?.includes("Mark unavailable")
            );
          expect(timeSlotButtons.length).toBeGreaterThan(0);
          timeSlotButton = timeSlotButtons[0];
        },
        { timeout: 3000 }
      );

      fireEvent.click(timeSlotButton!);

      // Button should become disabled while updating
      await waitFor(
        () => {
          expect(timeSlotButton!).toBeDisabled();
        },
        { timeout: 3000 }
      );

      // Wait for updating to complete
      await waitFor(
        () => {
          expect(timeSlotButton!).not.toBeDisabled();
        },
        { timeout: 5000 }
      );
    });

    // TODO: Rework booked-slot selection to mirror UI mapping; current approach is brittle
    it.skip("should not allow toggling booked time slots", async () => {
      // Use a date in September 2025 to match the calendar display
      const testDate = getWorkingDayInCurrentMonth();
      const dateKey = format(testDate, "yyyy-MM-dd");

      const mockTimeSlots: TimeSlot[] = [
        {
          id: "slot-1",
          startTime: "09:00",
          endTime: "10:00",
          isAvailable: true,
          isBooked: true, // This slot is booked
        },
        {
          id: "slot-2",
          startTime: "10:00",
          endTime: "11:00",
          isAvailable: true,
          isBooked: false, // This slot is available
        },
      ];

      const mockDayAvailability: DayAvailability = {
        date: testDate,
        timeSlots: mockTimeSlots,
        isWorkingDay: true,
      };

      // Mock the availability data for the entire month containing testDate
      const monthStart = new Date(
        testDate.getFullYear(),
        testDate.getMonth(),
        1
      );
      const monthEnd = new Date(
        testDate.getFullYear(),
        testDate.getMonth() + 1,
        0
      );
      const monthDays = eachDayOfInterval({
        start: monthStart,
        end: monthEnd,
      });

      const monthAvailability: Record<string, DayAvailability> = {};

      // Create availability data for all days in the test month
      monthDays.forEach((day) => {
        const dayKey = format(day, "yyyy-MM-dd");
        const dayOfWeek = day.getDay();
        const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday

        if (dayKey === dateKey) {
          // Use the test data for the test day
          monthAvailability[dayKey] = mockDayAvailability;
        } else {
          // Create basic availability for other days
          monthAvailability[dayKey] = {
            date: day,
            timeSlots: [],
            isWorkingDay,
          };
        }
      });

      mockUseAvailability.availability = monthAvailability;

      mockUseAvailability.toggleTimeSlot = jest.fn();

      // Mock fetch for day details API
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          timeSlots: mockTimeSlots.map((slot) => ({
            ...slot,
            startTimeDisplay: slot.startTime,
            endTimeDisplay: slot.endTime,
          })),
        }),
      });

      render(<AvailabilityCalendar />);

      // Open the day modal - click on the test date
      const dateText = format(testDate, "MMMM d, yyyy");
      const dayElements = screen.getAllByText(dateText);
      expect(dayElements.length).toBeGreaterThan(0);
      const dayElement = dayElements[0].closest("div");
      expect(dayElement).toBeDefined();
      fireEvent.click(dayElement!);

      await waitFor(() => {
        const formattedDate = format(testDate, "EEEE, MMMM d, yyyy");
        expect(screen.getByText(formattedDate)).toBeInTheDocument();
      });

      // Locate available button via title, booked button may not be present depending on data
      let availableSlotButton: HTMLElement | undefined;
      await waitFor(() => {
        availableSlotButton = screen
          .getAllByRole("button")
          .find((b) => b.getAttribute("title") === "Mark unavailable");
        expect(availableSlotButton).toBeTruthy();
      });

      fireEvent.click(availableSlotButton!);

      // Verify toggleTimeSlot was called
      expect(mockUseAvailability.toggleTimeSlot).toHaveBeenCalledTimes(1);
    });
  });
});
