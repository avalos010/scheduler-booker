import { renderHook, act } from "@testing-library/react";
import { useAvailability } from "../../../lib/hooks/useAvailability";
import { useAuth } from "../../../lib/hooks/useAuth";

// Mock dependencies
jest.mock("../../../lib/hooks/useAuth");
jest.mock("../../../lib/supabase", () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: null, error: null })),
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: jest.fn(() => Promise.resolve({ data: [], error: null })),
      upsert: jest.fn(() => Promise.resolve({ error: null })),
      delete: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe("useAvailability", () => {
  const mockUser = {
    id: "test-user-id",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2023-01-01T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser, loading: false });
  });

  it("initializes with default settings", () => {
    const { result } = renderHook(() => useAvailability());

    expect(result.current.settings.slotDuration).toBe(60);
    expect(result.current.settings.breakDuration).toBe(60);
    expect(result.current.settings.advanceBookingDays).toBe(30);
  });

  it("updates settings correctly", () => {
    const { result } = renderHook(() => useAvailability());

    act(() => {
      result.current.updateSettings({ slotDuration: 90 });
    });

    expect(result.current.settings.slotDuration).toBe(90);
    expect(result.current.settings.breakDuration).toBe(60); // unchanged
  });

  it("updates working hours correctly", () => {
    const { result } = renderHook(() => useAvailability());

    act(() => {
      result.current.updateWorkingHours(0, "startTime", "10:00");
    });

    expect(result.current.workingHours[0].startTime).toBe("10:00");
  });

  it("generates default time slots correctly", () => {
    const { result } = renderHook(() => useAvailability());

    const timeSlots = result.current.generateDefaultTimeSlots(
      "09:00",
      "17:00",
      60
    );

    expect(timeSlots).toHaveLength(8); // 8 one-hour slots from 9 AM to 5 PM
    expect(timeSlots[0].startTime).toBe("09:00");
    expect(timeSlots[0].endTime).toBe("10:00");
    expect(timeSlots[0].isAvailable).toBe(true);
  });

  it("updates day availability correctly", () => {
    const { result } = renderHook(() => useAvailability());
    const testDate = new Date("2024-01-15");

    act(() => {
      result.current.updateDayAvailability(testDate, {
        isWorkingDay: false,
        timeSlots: [],
      });
    });

    const dateKey = testDate.toISOString().split("T")[0];
    expect(result.current.availability[dateKey]?.isWorkingDay).toBe(false);
  });

  it("toggles working day status", () => {
    const { result } = renderHook(() => useAvailability());
    const testDate = new Date("2024-01-15");

    // First, set up the day
    act(() => {
      result.current.updateDayAvailability(testDate, {
        isWorkingDay: true,
        timeSlots: [],
      });
    });

    // Then toggle it
    act(() => {
      result.current.toggleWorkingDay(testDate);
    });

    const dateKey = testDate.toISOString().split("T")[0];
    expect(result.current.availability[dateKey]?.isWorkingDay).toBe(false);
  });

  it("toggles time slot availability", () => {
    const { result } = renderHook(() => useAvailability());
    const testDate = new Date("2024-01-15");
    const testSlot = {
      id: "test-slot",
      startTime: "09:00",
      endTime: "10:00",
      isAvailable: true,
    };

    // First, set up the day with a time slot
    act(() => {
      result.current.updateDayAvailability(testDate, {
        isWorkingDay: true,
        timeSlots: [testSlot],
      });
    });

    // Then toggle the time slot
    act(() => {
      result.current.toggleTimeSlot(testDate, "test-slot");
    });

    const dateKey = testDate.toISOString().split("T")[0];
    expect(
      result.current.availability[dateKey]?.timeSlots[0]?.isAvailable
    ).toBe(false);
  });

  it("handles refresh calendar correctly", () => {
    const { result } = renderHook(() => useAvailability());
    const testDate = new Date("2024-01-15");

    // Set up some availability data
    act(() => {
      result.current.updateDayAvailability(testDate, {
        isWorkingDay: true,
        timeSlots: [],
      });
    });

    // Verify data exists
    const dateKey = testDate.toISOString().split("T")[0];
    expect(result.current.availability[dateKey]).toBeDefined();

    // Refresh calendar
    act(() => {
      result.current.refreshCalendar();
    });

    // Verify data is cleared
    expect(result.current.availability[dateKey]).toBeUndefined();
  });
});
