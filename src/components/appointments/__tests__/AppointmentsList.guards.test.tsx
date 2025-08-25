import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import AppointmentsList from "../AppointmentsList";
import { format } from "date-fns";

// Mock fetch
global.fetch = jest.fn();

describe("AppointmentsList guards and actions", () => {
  const mockUserId = "test-user-id";

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  function makeBooking({
    id,
    date,
    start,
    end,
    status,
  }: {
    id: string;
    date: string;
    start: string;
    end: string;
    status: "pending" | "confirmed" | "cancelled" | "completed" | "no-show";
  }) {
    return {
      id,
      date,
      start_time: start,
      end_time: end,
      client_name: "Test Client",
      client_email: "test@example.com",
      client_phone: null,
      notes: null,
      status,
      created_at: new Date().toISOString(),
    };
  }

  it("disables No Show before 15 minutes after start", async () => {
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd");
    // Start 10 minutes from now
    const start = format(new Date(now.getTime() + 10 * 60000), "HH:mm");
    const end = format(new Date(now.getTime() + 70 * 60000), "HH:mm");

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bookings: [
          makeBooking({
            id: "b1",
            date: dateStr,
            start,
            end,
            status: "confirmed",
          }),
        ],
      }),
    });

    render(<AppointmentsList userId={mockUserId} />);

    // Wait for booking to load
    await waitFor(() =>
      expect(screen.getByText("Confirmed Appointments (1)")).toBeInTheDocument()
    );

    const noShowBtn = screen.getByRole("button", { name: /no show/i });
    expect(noShowBtn).toBeDisabled();
  });

  it("disables Mark Complete before start", async () => {
    const now = new Date();
    const dateStr = format(now, "yyyy-MM-dd");
    const start = format(new Date(now.getTime() + 30 * 60000), "HH:mm");
    const end = format(new Date(now.getTime() + 90 * 60000), "HH:mm");

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bookings: [
          makeBooking({
            id: "b2",
            date: dateStr,
            start,
            end,
            status: "confirmed",
          }),
        ],
      }),
    });

    render(<AppointmentsList userId={mockUserId} />);

    await waitFor(() =>
      expect(screen.getByText(/Confirmed Appointments/)).toBeInTheDocument()
    );
    const completeBtn = screen.getByRole("button", { name: /mark complete/i });
    expect(completeBtn).toBeDisabled();
  });

  it("hides Rebook button for completed bookings", async () => {
    const dateStr = format(new Date(), "yyyy-MM-dd");

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        bookings: [
          makeBooking({
            id: "b3",
            date: dateStr,
            start: "09:00",
            end: "10:00",
            status: "completed",
          }),
        ],
      }),
    });

    render(<AppointmentsList userId={mockUserId} />);
    await waitFor(() =>
      expect(screen.getByText(/Other Appointments/)).toBeInTheDocument()
    );

    // Ensure there's no rebook button rendered
    expect(
      screen.queryByRole("button", { name: /rebook/i })
    ).not.toBeInTheDocument();
  });
});
