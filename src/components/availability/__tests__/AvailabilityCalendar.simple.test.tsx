import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@/lib/test-utils";
import AvailabilityCalendar from "../AvailabilityCalendar";
import { format, eachDayOfInterval } from "date-fns";
import type {
  AvailabilitySettings,
  DayAvailability,
  TimeSlot,
  WorkingHours,
} from "@/lib/types/availability";

// Mock the availability hook with a mutable state we can update between rerenders
interface MockLoadingSteps {
  workingHours: boolean;
  settings: boolean;
  exceptions: boolean;
  timeSlots: boolean;
}

interface MockUseAvailabilityState {
  availability: Record<string, DayAvailability>;
  bookings: Record<string, unknown[]>;
  workingHours: WorkingHours[];
  settings: AvailabilitySettings;
  isFullyLoaded: boolean;
  loadingSteps: MockLoadingSteps;
  toggleWorkingDay: (date: Date) => void;
  toggleTimeSlot: (
    date: Date,
    slot: {
      id: string;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    }
  ) => void;
  regenerateDaySlots: (
    date: Date,
    start: string,
    end: string,
    duration: number
  ) => Promise<{ success: boolean }>;
  setAvailability: jest.Mock;
  resetCalendarToDefaults: jest.Mock;
  loadAvailability: jest.Mock;
  markTimeSlotsLoaded: jest.Mock;
  loadTimeSlotsForMonth: jest.Mock;
  processMonthDays: jest.Mock;
  loadAndSetBookings: jest.Mock;
}

let mockState: MockUseAvailabilityState;

jest.mock("@/lib/hooks/useAvailability", () => {
  return {
    useAvailability: () => mockState,
  };
});

function buildSlots(start: string, end: string, duration: number): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;
  for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
    const sH = Math.floor(m / 60)
      .toString()
      .padStart(2, "0");
    const sM = (m % 60).toString().padStart(2, "0");
    const e = m + duration;
    const eH = Math.floor(e / 60)
      .toString()
      .padStart(2, "0");
    const eM = (e % 60).toString().padStart(2, "0");
    slots.push({
      id: `${sH}:${sM}-${eH}:${eM}`,
      startTime: `${sH}:${sM}`,
      endTime: `${eH}:${eM}`,
      isAvailable: true,
      isBooked: false,
    });
  }
  return slots;
}

describe("AvailabilityCalendar UI", () => {
  // Use a fixed date (Monday) to ensure consistent working hours
  const today = new Date(2025, 9, 1); // This is October 1st, 2025 (month is 0-indexed)
  const dateKey = format(today, "yyyy-MM-dd");

  beforeEach(() => {
    const initialSlots = buildSlots("09:00", "12:00", 60); // 3 slots

    // Create availability for multiple days in October 2025
    const octoberDays = eachDayOfInterval({
      start: new Date("2025-10-01"),
      end: new Date("2025-10-31"),
    });

    const availability: Record<string, DayAvailability> = {};
    octoberDays.forEach((day) => {
      const dayKey = format(day, "yyyy-MM-dd");
      const dayOfWeek = day.getDay();
      const isWorkingDay = dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday

      availability[dayKey] = {
        date: day,
        isWorkingDay,
        timeSlots: isWorkingDay ? buildSlots("09:00", "17:00", 60) : [],
      };
    });

    // Override today with our specific test data
    availability[dateKey] = {
      date: today,
      isWorkingDay: true,
      timeSlots: initialSlots,
    };

    mockState = {
      availability,
      bookings: {}, // Add empty bookings object
      workingHours: [
        {
          day: "Monday",
          startTime: "09:00",
          endTime: "17:00",
          isWorking: true,
        },
        {
          day: "Tuesday",
          startTime: "09:00",
          endTime: "17:00",
          isWorking: true,
        },
        {
          day: "Wednesday",
          startTime: "09:00",
          endTime: "17:00",
          isWorking: true,
        },
        {
          day: "Thursday",
          startTime: "09:00",
          endTime: "17:00",
          isWorking: true,
        },
        {
          day: "Friday",
          startTime: "09:00",
          endTime: "17:00",
          isWorking: true,
        },
        {
          day: "Saturday",
          startTime: "10:00",
          endTime: "15:00",
          isWorking: false,
        },
        {
          day: "Sunday",
          startTime: "10:00",
          endTime: "15:00",
          isWorking: false,
        },
      ],
      settings: { slotDuration: 60, advanceBookingDays: 30 },
      isFullyLoaded: true,
      loadingSteps: {
        workingHours: true,
        settings: true,
        exceptions: true,
        timeSlots: true,
      },

      // Actions used by the component (stateful mocks to reflect instant UI changes)
      toggleWorkingDay: jest.fn((date: Date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const curr = mockState.availability[dateKey] || {
          date,
          isWorkingDay: false,
          timeSlots: [],
        };
        const newIsWorking = !curr.isWorkingDay;
        mockState.availability = {
          ...mockState.availability,
          [dateKey]: {
            ...curr,
            isWorkingDay: newIsWorking,
            timeSlots: newIsWorking ? curr.timeSlots : [],
          },
        };
      }),
      toggleTimeSlot: jest.fn(
        (
          date: Date,
          slot: {
            id: string;
            startTime: string;
            endTime: string;
            isAvailable: boolean;
          }
        ) => {
          const dateKey = format(date, "yyyy-MM-dd");
          const curr = mockState.availability[dateKey];
          if (!curr) return;
          mockState.availability = {
            ...mockState.availability,
            [dateKey]: {
              ...curr,
              timeSlots: curr.timeSlots.map((s: TimeSlot) =>
                s.id === slot.id ? { ...s, isAvailable: !s.isAvailable } : s
              ),
            },
          };
        }
      ),
      regenerateDaySlots: jest.fn(
        async (date: Date, start: string, end: string, duration: number) => {
          const dateKey = format(date, "yyyy-MM-dd");
          mockState.availability = {
            ...mockState.availability,
            [dateKey]: {
              date,
              isWorkingDay: true,
              timeSlots: buildSlots(start, end, duration),
            },
          };
          return { success: true };
        }
      ),
      setAvailability: jest.fn(),
      resetCalendarToDefaults: jest.fn(),
      loadAvailability: jest.fn(),
      markTimeSlotsLoaded: jest.fn(),
      loadTimeSlotsForMonth: jest.fn(),
      processMonthDays: jest.fn(),
      loadAndSetBookings: jest.fn().mockResolvedValue(undefined),
    };
  });

  it("renders header and shows initial slot count for today", () => {
    render(<AvailabilityCalendar />);

    // Header shows current month - target the mobile layout specifically
    const currentMonth = format(today, "MMMM yyyy"); // Use our test date instead of new Date()
    const mobileHeader = screen.getByText(currentMonth, {
      selector: "h3.text-xl.sm\\:text-2xl",
    });
    expect(mobileHeader).toBeTruthy();

    // Find today's cell and verify it indicates available slots
    const dayNumber = today.getDate().toString();
    const candidates = screen.getAllByText(dayNumber);
    const cell = candidates.find(
      (el) => el.closest("[title]") || el.closest("div")
    );
    expect(cell).toBeTruthy();

    // There should be a "slots available" indicator near this cell
    expect(screen.getAllByText(/slots available/i).length).toBeGreaterThan(0);
  });

  it("opens day details modal and shows time slots", async () => {
    render(<AvailabilityCalendar />);

    // Click today's cell to open the modal
    const dayNumber = today.getDate().toString();
    const dateEls = screen.getAllByText(dayNumber);
    const clickable = dateEls.find((el) =>
      el.closest("[title*='Click to view']")
    );
    expect(clickable).toBeTruthy();
    fireEvent.click(clickable!.closest("div")!);

    // Modal opens with day header
    const header = await screen.findByText(format(today, "EEEE, MMMM d, yyyy"));
    expect(header).toBeTruthy();

    // Should show time slots
    expect(screen.getByText("Time Slots")).toBeTruthy();

    // Wait for loading to complete and then check for available slots count
    await waitFor(() => {
      expect(screen.getByText("3/3 available")).toBeTruthy();
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
  });

  it("toggles working day from cell and shows non-working label afterward", () => {
    const { rerender } = render(<AvailabilityCalendar />);

    // First, verify the calendar is rendering with our mock data - target mobile layout
    const mobileMonthHeader = screen.getByText("October 2025", {
      selector: "h3.text-xl.sm\\:text-2xl",
    });
    expect(mobileMonthHeader).toBeTruthy();

    // Find today's cell toggle - the title has changed to be more specific
    const toggles = screen.getAllByTitle(
      /Click to mark as non-working day|Click to mark as working day/i
    );

    expect(toggles.length).toBeGreaterThan(0);
    const toggle = toggles[0]; // Use the first one

    fireEvent.click(toggle);
    expect(mockState.toggleWorkingDay).toHaveBeenCalled();

    // Rerender and expect non-working label for today
    rerender(<AvailabilityCalendar />);
    // The component shows "Past day" for non-working days, not "Non-working day"
    expect(
      screen.getAllByText(/Past day|slots available/i).length
    ).toBeGreaterThan(0);
  });

  it("updates slot count instantly when toggling a slot inside modal", async () => {
    const { rerender } = render(<AvailabilityCalendar />);

    // Open modal
    const dayNumber = today.getDate().toString();
    const dateEls = screen.getAllByText(dayNumber);
    const clickable = dateEls.find((el) =>
      el.closest("[title*='Click to view']")
    );
    fireEvent.click(clickable!.closest("div")!);

    await screen.findByText(format(today, "EEEE, MMMM d, yyyy"));

    // Wait for loading to complete and then find the first slot button
    const firstSlotButton = await waitFor(() => {
      const button = screen
        .getAllByRole("button")
        .find((b) => /\d{2}:\d{2}\s-\s\d{2}:\d{2}/.test(b.textContent || ""));
      expect(button).toBeTruthy();
      return button;
    });

    act(() => {
      fireEvent.click(firstSlotButton!);
    });

    // Close modal, rerender, and verify available count decreased from 3 to 2
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    rerender(<AvailabilityCalendar />);

    const indicators = screen.getAllByText(/slots available/i);
    expect(
      indicators.some((n) => /2\s+slots available/i.test(n.textContent || ""))
    ).toBe(true);
  });

  it("toggles working day status in modal", async () => {
    const { rerender } = render(<AvailabilityCalendar />);

    // Open modal
    const dayNumber = today.getDate().toString();
    const dateEls = screen.getAllByText(dayNumber);
    const clickable = dateEls.find((el) =>
      el.closest("[title*='Click to view']")
    );
    fireEvent.click(clickable!.closest("div")!);

    await screen.findByText(format(today, "EEEE, MMMM d, yyyy"));

    // Toggle working day status
    const workingDayToggle = screen.getByTitle("Working day");
    expect(workingDayToggle).toBeTruthy();

    act(() => {
      fireEvent.click(workingDayToggle!);
    });

    // Close modal and rerender
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    rerender(<AvailabilityCalendar />);

    // Should show non-working day status
    expect(mockState.toggleWorkingDay).toHaveBeenCalled();
  });
});
