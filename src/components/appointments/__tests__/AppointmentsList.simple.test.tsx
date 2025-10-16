import { render, screen } from "@/lib/test-utils";
import "@testing-library/jest-dom";
import AppointmentsList from "../AppointmentsList";

// Mock fetch
global.fetch = jest.fn();

describe("AppointmentsList", () => {

  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it("renders loading state initially", () => {
    render(<AppointmentsList />);

    expect(screen.getByText("Loading appointments...")).toBeInTheDocument();
  });

  it("renders empty state when no appointments", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bookings: [] }),
    });

    render(<AppointmentsList />);

    expect(await screen.findByText("No appointments")).toBeInTheDocument();
    expect(
      screen.getByText(/You don't have any appointments yet/)
    ).toBeInTheDocument();
  });

  it("renders pending bookings section", async () => {
    const mockBookings = [
      {
        id: "booking-1",
        date: "2024-01-15",
        start_time: "09:00",
        end_time: "10:00",
        client_name: "John Doe",
        client_email: "john@example.com",
        client_phone: null,
        notes: null,
        status: "pending",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bookings: mockBookings }),
    });

    render(<AppointmentsList />);

    expect(await screen.findByText("Pending Bookings (1)")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("Accept")).toBeInTheDocument();
    expect(screen.getByText("Decline")).toBeInTheDocument();
  });

  it("renders confirmed bookings section", async () => {
    const mockBookings = [
      {
        id: "booking-1",
        date: "2024-01-15",
        start_time: "09:00",
        end_time: "10:00",
        client_name: "Jane Smith",
        client_email: "jane@example.com",
        client_phone: null,
        notes: null,
        status: "confirmed",
        created_at: "2024-01-01T00:00:00Z",
      },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ bookings: mockBookings }),
    });

    render(<AppointmentsList />);

    expect(
      await screen.findByText("Confirmed Appointments (1)")
    ).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("Mark Complete")).toBeInTheDocument();
    expect(screen.getByText("No Show")).toBeInTheDocument();
  });
});
