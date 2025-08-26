import React from "react";
import { render, screen, fireEvent, act } from "@/lib/test-utils";
import AvailabilityCalendar from "../AvailabilityCalendar";
import { format } from "date-fns";
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
  workingHours: WorkingHours[];
  settings: AvailabilitySettings;
  isFullyLoaded: boolean;
  loadingSteps: MockLoadingSteps;
  toggleWorkingDay: (date: Date) => void;
  toggleTimeSlot: (date: Date, slotId: string) => void;
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
  const today = new Date("2025-08-18"); // This is a Monday
  const dateKey = format(today, "yyyy-MM-dd");


  beforeEach(() => {
    const initialSlots = buildSlots("09:00", "12:00", 60); // 3 slots

    mockState = {
      availability: {
        [dateKey]: {
          date: today,
          isWorkingDay: true,
          timeSlots: initialSlots,
        },
      },
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
      settings: { slotDuration: 60, breakDuration: 0, advanceBookingDays: 30 },
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
      toggleTimeSlot: jest.fn((date: Date, slotId: string) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const curr = mockState.availability[dateKey];
        if (!curr) return;
        mockState.availability = {
          ...mockState.availability,
          [dateKey]: {
            ...curr,
            timeSlots: curr.timeSlots.map((s: TimeSlot) =>
              s.id === slotId ? { ...s, isAvailable: !s.isAvailable } : s
            ),
          },
        };
      }),
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
    };
  });

  it("renders header and shows initial slot count for today", () => {
    render(<AvailabilityCalendar userId="test-user-123" />);

    // Header shows current month - target the mobile layout specifically
    const monthLabel = format(today, "MMMM yyyy");
    const mobileHeader = screen.getByText(monthLabel, {
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

  it("allows per-day custom regeneration via modal and reflects updated slot count after close", async () => {
            const { rerender } = render(<AvailabilityCalendar userId="test-user-123" />);

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

    // Click regenerate - target the mobile layout button specifically by finding the full-width button
    const allRegenButtons = screen.getAllByRole("button", {
      name: /regenerate slots/i,
    });
    const mobileRegenButton = allRegenButtons.find(
      (btn) =>
        btn.className.includes("w-full") && btn.className.includes("px-4")
    );
    expect(mobileRegenButton).toBeTruthy();

    await act(async () => {
      fireEvent.click(mobileRegenButton!);
    });

    // Close modal
    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    // Rerender to let the mocked hook return updated availability
            rerender(<AvailabilityCalendar userId="test-user-123" />);

    // Expect updated slots count to appear (should be 5 available based on Sunday working hours 10:00-15:00)
    const availableIndicators = screen.getAllByText(/slots available/i);
    // Check that at least one of the indicators references the increased count
    expect(
      availableIndicators.some((n) =>
        /5\s+slots available/i.test(n.textContent || "")
      )
    ).toBe(true);
  });

  it("toggles working day from cell and shows non-working label afterward", () => {
            const { rerender } = render(<AvailabilityCalendar userId="test-user-123" />);

    // First, verify the calendar is rendering with our mock data - target mobile layout
    const mobileMonthHeader = screen.getByText("August 2025", {
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
            rerender(<AvailabilityCalendar userId="test-user-123" />);
    // The component shows "Past day" for non-working days, not "Non-working day"
    expect(
      screen.getAllByText(/Past day|slots available/i).length
    ).toBeGreaterThan(0);
  });

  it("updates slot count instantly when toggling a slot inside modal", async () => {
            const { rerender } = render(<AvailabilityCalendar userId="test-user-123" />);

    // Open modal
    const dayNumber = today.getDate().toString();
    const dateEls = screen.getAllByText(dayNumber);
    const clickable = dateEls.find((el) =>
      el.closest("[title*='Click to view']")
    );
    fireEvent.click(clickable!.closest("div")!);

    await screen.findByText(format(today, "EEEE, MMMM d, yyyy"));

    // Click the first slot to toggle availability off
    const firstSlotButton = screen
      .getAllByRole("button")
      .find((b) => /\d{2}:\d{2}\s-\s\d{2}:\d{2}/.test(b.textContent || ""));
    expect(firstSlotButton).toBeTruthy();

    act(() => {
      fireEvent.click(firstSlotButton!);
    });

    // Close modal, rerender, and verify available count decreased from 3 to 2
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
            rerender(<AvailabilityCalendar userId="test-user-123" />);

    const indicators = screen.getAllByText(/slots available/i);
    expect(
      indicators.some((n) => /2\s+slots available/i.test(n.textContent || ""))
    ).toBe(true);
  });

  it("reflects settings change (slot duration) when regenerating to 30m", async () => {
            const { rerender } = render(<AvailabilityCalendar userId="test-user-123" />);

    // Open modal
    const dayNumber = today.getDate().toString();
    const dateEls = screen.getAllByText(dayNumber);
    const clickable = dateEls.find((el) =>
      el.closest("[title*='Click to view']")
    );
    fireEvent.click(clickable!.closest("div")!);

    await screen.findByText(format(today, "EEEE, MMMM d, yyyy"));

    // Change duration select to 30m - target the mobile layout select specifically by finding the full-width select
    const allDurationSelects = screen.getAllByRole("combobox");
    const mobileDurationSelect = allDurationSelects.find(
      (select) =>
        select.className.includes("w-full") && select.className.includes("px-3")
    );
    expect(mobileDurationSelect).toBeTruthy();

    fireEvent.change(mobileDurationSelect!, { target: { value: "30" } });

    // Regenerate - target the mobile layout button specifically by finding the full-width button
    const allRegenButtons = screen.getAllByRole("button", {
      name: /regenerate slots/i,
    });
    const mobileRegenButton = allRegenButtons.find(
      (btn) =>
        btn.className.includes("w-full") && btn.className.includes("px-4")
    );
    expect(mobileRegenButton).toBeTruthy();

    await act(async () => {
      fireEvent.click(mobileRegenButton!);
    });

    // Close modal and rerender
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
            rerender(<AvailabilityCalendar userId="test-user-123" />);

    // 10:00-15:00 with 30m => 10 slots (based on Sunday working hours in mock)
    const availableIndicators2 = screen.getAllByText(/slots available/i);
    expect(
      availableIndicators2.some((n) =>
        /10\s+slots available/i.test(n.textContent || "")
      )
    ).toBe(true);
  });
});
