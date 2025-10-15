import { render, screen, act } from "@/lib/test-utils";
import "@testing-library/jest-dom";
import BookingForm from "../BookingForm";

// Mock fetch
global.fetch = jest.fn();

describe("BookingForm", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it("renders the booking form with date selection", () => {
    render(<BookingForm />);

    expect(screen.getByText("Select Date")).toBeInTheDocument();
    // The "Book Appointments" text is in the parent page, not this component
  });

  it("shows available dates for the next 30 days", () => {
    render(<BookingForm />);

    // Should show today's date
    const today = new Date();
    const todayFormatted = today.getDate().toString();
    expect(screen.getByText(todayFormatted)).toBeInTheDocument();
  });

  it("shows time slot selection after date is selected", async () => {
    render(<BookingForm />);

    // Mock the API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        date: new Date(),
        timeSlots: [
          {
            id: "slot-1",
            startTime: "09:00",
            endTime: "10:00",
            isAvailable: true,
            isBooked: false,
          },
        ],
        isWorkingDay: true,
      }),
    });

    // Click on today's date
    const today = new Date();
    const todayFormatted = today.getDate().toString();
    const todayButton = screen.getByText(todayFormatted);

    await act(async () => {
      todayButton.click();
    });

    // Should show time slot selection
    expect(screen.getByText(/Available Time Slots for/)).toBeInTheDocument();
  });

  it("shows client form after time slot is selected", async () => {
    render(<BookingForm />);

    // Mock the API response for date selection
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        date: new Date(),
        timeSlots: [
          {
            id: "slot-1",
            startTime: "09:00",
            endTime: "10:00",
            isAvailable: true,
            isBooked: false,
          },
        ],
        isWorkingDay: true,
      }),
    });

    // Click on today's date
    const today = new Date();
    const todayFormatted = today.getDate().toString();
    const todayButton = screen.getByText(todayFormatted);

    await act(async () => {
      todayButton.click();
    });

    // Wait for time slots to load and click on one
    const timeSlotButton = await screen.findByText("09:00");

    await act(async () => {
      timeSlotButton.click();
    });

    // Should show client form
    expect(screen.getByText("Client Information")).toBeInTheDocument();
    expect(screen.getByLabelText("Client Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Client Email *")).toBeInTheDocument();
  });
});
