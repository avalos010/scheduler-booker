import { renderHook, act, waitFor } from "@testing-library/react";
import { useAvailability } from "../../../lib/hooks/useAvailability";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../lib/hooks/useAuth";

// Mock dependencies
jest.mock("../../../lib/hooks/useAuth");

const mockSupabase = supabase;
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

    // Reset all mocks
    const mockFrom = mockSupabase.from as jest.Mock;
    mockFrom.mockClear();
  });

  it("loads availability settings from database on mount", async () => {
    const mockSettings = {
      slot_duration_minutes: 45,
      break_duration_minutes: 30,
      advance_booking_days: 14,
    };

    const mockWorkingHours = [
      {
        day_of_week: 1,
        start_time: "08:00",
        end_time: "16:00",
        is_working: true,
      },
      {
        day_of_week: 2,
        start_time: "08:00",
        end_time: "16:00",
        is_working: true,
      },
    ];

    // Mock the from method to return different results based on table name
    const mockFrom = mockSupabase.from as jest.Mock;
    mockFrom.mockImplementation((table) => {
      if (table === "user_availability_settings") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: mockSettings, error: null }),
            }),
          }),
        };
      } else if (table === "user_working_hours") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest
                .fn()
                .mockResolvedValue({ data: mockWorkingHours, error: null }),
            }),
          }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useAvailability());

    await waitFor(() => {
      expect(result.current.settings.slotDuration).toBe(45);
      expect(result.current.settings.breakDuration).toBe(30);
      expect(result.current.settings.advanceBookingDays).toBe(14);
    });
  });

  it("creates default settings when none exist", async () => {
    // Mock no existing settings and working hours
    const mockFrom = mockSupabase.from as jest.Mock;
    mockFrom.mockImplementation((table) => {
      if (table === "user_availability_settings") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      } else if (table === "user_working_hours") {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        };
      } else if (table === "user_availability_settings") {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      } else if (table === "user_working_hours") {
        return {
          insert: jest.fn().mockResolvedValue({ error: null }),
        };
      }
      return {};
    });

    const { result } = renderHook(() => useAvailability());

    await waitFor(() => {
      expect(result.current.settings.slotDuration).toBe(60);
      expect(result.current.settings.breakDuration).toBe(60);
      expect(result.current.settings.advanceBookingDays).toBe(30);
    });
  });

  it("saves availability settings to database", async () => {
    const { result } = renderHook(() => useAvailability());

    // Mock successful upsert
    const mockFrom = mockSupabase.from as jest.Mock;
    mockFrom.mockImplementation(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
    }));

    // Update settings
    act(() => {
      result.current.updateSettings({ slotDuration: 90 });
    });

    // Save to database
    const saveResult = await act(async () => {
      return await result.current.saveAvailability();
    });

    expect(saveResult.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("user_availability_settings");
    expect(mockFrom).toHaveBeenCalledWith("user_working_hours");
  });

  it("handles save errors gracefully", async () => {
    const { result } = renderHook(() => useAvailability());

    // Mock error on save
    const mockFrom = mockSupabase.from as jest.Mock;
    mockFrom.mockImplementation(() => ({
      upsert: jest.fn().mockResolvedValue({
        error: { message: "Database error" },
      }),
    }));

    const saveResult = await act(async () => {
      return await result.current.saveAvailability();
    });

    expect(saveResult.success).toBe(false);
    expect(saveResult.error).toBeDefined();
  });
});
