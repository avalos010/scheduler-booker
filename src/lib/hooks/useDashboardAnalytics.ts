import { useState, useEffect } from "react";

interface DashboardStats {
  todayBookings: number;
  todayTrend: number;
  availableSlots: number;
  totalSlots: number;
  totalClients: number;
  bookingRate: number;
}

interface WeeklyTrendData {
  day: string;
  bookings: number;
  available: number;
}

interface DailyAvailabilityData {
  time: string;
  slots: number;
  booked: number;
}

interface BookingStatusData {
  name: string;
  value: number;
  color: string;
}

interface DashboardData {
  stats: DashboardStats;
  charts: {
    weeklyTrend: WeeklyTrendData[];
    dailyAvailability: DailyAvailabilityData[];
    bookingStatus: BookingStatusData[];
  };
  period: {
    start: string;
    end: string;
    type: string;
  };
}

interface UseDashboardAnalyticsReturn {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  period: string;
  setPeriod: (period: string) => void;
}

export function useDashboardAnalytics(): UseDashboardAnalyticsReturn {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState("week");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(
        `/api/dashboard/analytics?period=${period}`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        throw new Error(result.error || "Failed to fetch dashboard data");
      }
    } catch (err) {
      console.error("Error fetching dashboard analytics:", err);

      if (err instanceof Error && err.name === "AbortError") {
        setError("Request timed out. Please try again.");
      } else {
        setError(err instanceof Error ? err.message : "An error occurred");
      }

      // Fallback to hardcoded data if API fails
      setData({
        stats: {
          todayBookings: 0,
          todayTrend: 0,
          availableSlots: 0,
          totalSlots: 0,
          totalClients: 0,
          bookingRate: 0,
        },
        charts: {
          weeklyTrend: [
            { day: "Mon", bookings: 0, available: 0 },
            { day: "Tue", bookings: 0, available: 0 },
            { day: "Wed", bookings: 0, available: 0 },
            { day: "Thu", bookings: 0, available: 0 },
            { day: "Fri", bookings: 0, available: 0 },
            { day: "Sat", bookings: 0, available: 0 },
            { day: "Sun", bookings: 0, available: 0 },
          ],
          dailyAvailability: [
            { time: "9AM", slots: 0, booked: 0 },
            { time: "10AM", slots: 0, booked: 0 },
            { time: "11AM", slots: 0, booked: 0 },
            { time: "12PM", slots: 0, booked: 0 },
            { time: "1PM", slots: 0, booked: 0 },
            { time: "2PM", slots: 0, booked: 0 },
            { time: "3PM", slots: 0, booked: 0 },
            { time: "4PM", slots: 0, booked: 0 },
          ],
          bookingStatus: [
            { name: "Confirmed", value: 0, color: "#10B981" },
            { name: "Pending", value: 0, color: "#F59E0B" },
            { name: "Cancelled", value: 0, color: "#EF4444" },
          ],
        },
        period: {
          start: new Date().toISOString().split("T")[0],
          end: new Date().toISOString().split("T")[0],
          type: period,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [period]);

  const refetch = () => {
    fetchData();
  };

  return {
    data,
    loading,
    error,
    refetch,
    period,
    setPeriod,
  };
}
