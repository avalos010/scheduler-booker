import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import SharedAvailabilityCalendar from "../SharedAvailabilityCalendar";

describe("SharedAvailabilityCalendar status badges", () => {
  const baseProps = {
    onDateSelect: jest.fn(),
    onTimeSlotSelect: jest.fn(),
    selectedDate: new Date("2024-01-01"),
    selectedTimeSlot: null,
    isLoading: false,
    showBookingDetails: true,
  };

  it("shows distinct badges for statuses", () => {
    render(
      <SharedAvailabilityCalendar
        {...baseProps}
        dayAvailability={{
          date: new Date("2024-01-01"),
          isWorkingDay: true,
          timeSlots: [
            {
              id: "1",
              startTime: "09:00",
              endTime: "10:00",
              isAvailable: false,
              isBooked: true,
              bookingDetails: {
                clientName: "A",
                clientEmail: "a@example.com",
                status: "pending",
              },
            },
            {
              id: "2",
              startTime: "10:00",
              endTime: "11:00",
              isAvailable: false,
              isBooked: true,
              bookingDetails: {
                clientName: "B",
                clientEmail: "b@example.com",
                status: "confirmed",
              },
            },
            {
              id: "3",
              startTime: "11:00",
              endTime: "12:00",
              isAvailable: false,
              isBooked: true,
              bookingDetails: {
                clientName: "C",
                clientEmail: "c@example.com",
                status: "cancelled",
              },
            },
          ],
        }}
      />
    );

    expect(screen.getByText("⏳ Pending")).toBeInTheDocument();
    expect(screen.getByText("✓ Confirmed")).toBeInTheDocument();
    expect(screen.getByText("✕ Cancelled")).toBeInTheDocument();
  });
});
