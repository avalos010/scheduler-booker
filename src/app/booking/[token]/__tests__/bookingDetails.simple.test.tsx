import React from "react";
import { render, screen, waitFor } from "@/lib/test-utils";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import PublicBookingDetailsPage from "../page";
import type { Booking } from "@/lib/types/availability";

// Mock Next.js useParams
const mockToken = "test-access-token-123";
jest.mock("next/navigation", () => ({
  useParams: () => ({ token: mockToken }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock snackbar
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock("@/components/snackbar", () => ({
  useSnackbar: () => ({
    success: mockSuccess,
    error: mockError,
    info: jest.fn(),
    warning: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
    dismissAll: jest.fn(),
  }),
}));

// Mock the booking hooks
const mockBookingData = jest.fn();
const mockUpdateBooking = jest.fn();
const mockCancelBooking = jest.fn();

jest.mock("@/lib/hooks/queries", () => ({
  useBookingByToken: (token: string | null) => {
    if (!token) {
      return { data: undefined, isLoading: false, error: null };
    }
    return mockBookingData();
  },
  useUpdateBookingByToken: () => ({
    mutateAsync: mockUpdateBooking,
    isPending: false,
  }),
  useCancelBookingByToken: () => ({
    mutateAsync: mockCancelBooking,
    isPending: false,
  }),
}));

describe("PublicBookingDetailsPage", () => {
  const mockBooking: Booking = {
    id: "booking-1",
    user_id: "user-1",
    date: "2024-01-15",
    start_time: "2024-01-15T09:00:00Z",
    end_time: "2024-01-15T10:00:00Z",
    startTimeDisplay: "9:00 AM",
    endTimeDisplay: "10:00 AM",
    client_name: "John Doe",
    client_email: "john@example.com",
    client_phone: "123-456-7890",
    notes: "Test notes",
    status: "confirmed",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSuccess.mockClear();
    mockError.mockClear();
    mockUpdateBooking.mockClear();
    mockCancelBooking.mockClear();
  });

  it("displays loading state initially", () => {
    mockBookingData.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    expect(screen.getByText("Loading booking details...")).toBeInTheDocument();
  });

  it("displays error state when booking is not found", async () => {
    mockBookingData.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Booking not found"),
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Booking Not Found")).toBeInTheDocument();
      expect(screen.getByText("Booking not found")).toBeInTheDocument();
    });
  });

  it("displays default error message when booking data is missing", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: undefined },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Booking Not Found")).toBeInTheDocument();
      expect(
        screen.getByText(
          /The booking you're looking for doesn't exist or the access link is invalid/
        )
      ).toBeInTheDocument();
    });
  });

  it("displays booking details when loaded", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: mockBooking },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("123-456-7890")).toBeInTheDocument();
      expect(screen.getByText("Test notes")).toBeInTheDocument();
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
    });
  });

  it("displays booking date and time correctly", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: mockBooking },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText(/9:00 AM - 10:00 AM/)).toBeInTheDocument();
    });
  });

  it("hides phone number when not provided", async () => {
    const bookingWithoutPhone: Booking = {
      ...mockBooking,
      client_phone: undefined,
    };

    mockBookingData.mockReturnValue({
      data: { booking: bookingWithoutPhone },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("123-456-7890")).not.toBeInTheDocument();
    });
  });

  it("hides notes when not provided", async () => {
    const bookingWithoutNotes: Booking = {
      ...mockBooking,
      notes: undefined,
    };

    mockBookingData.mockReturnValue({
      data: { booking: bookingWithoutNotes },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.queryByText("Test notes")).not.toBeInTheDocument();
    });
  });

  it("shows edit form when Edit Details button is clicked", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: mockBooking },
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
    });

    const editButton = screen.getByRole("button", { name: /edit details/i });
    await user.click(editButton);

    expect(screen.getByText("Edit Your Information")).toBeInTheDocument();
    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/your email/i)).toBeInTheDocument();
  });

  it("allows updating booking details", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: mockBooking },
      isLoading: false,
      error: null,
    });

    mockUpdateBooking.mockResolvedValueOnce({
      message: "Booking updated successfully",
      booking: { ...mockBooking, client_name: "Jane Doe" },
    });

    const user = userEvent.setup();
    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
    });

    // Click Edit Details
    const editButton = screen.getByRole("button", { name: /edit details/i });
    await user.click(editButton);

    // Update the name field
    const nameInput = screen.getByLabelText(/your name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "Jane Doe");

    // Submit the form
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdateBooking).toHaveBeenCalledWith({
        token: mockToken,
        clientName: "Jane Doe",
        clientEmail: "john@example.com",
        clientPhone: "123-456-7890",
        notes: "Test notes",
      });
      expect(mockSuccess).toHaveBeenCalled();
    });
  });

  it("shows validation errors for invalid form data", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: mockBooking },
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
    });

    // Click Edit Details
    const editButton = screen.getByRole("button", { name: /edit details/i });
    await user.click(editButton);

    // Clear required fields
    const nameInput = screen.getByLabelText(/your name/i);
    const emailInput = screen.getByLabelText(/your email/i);

    await user.clear(nameInput);
    await user.clear(emailInput);

    // Try to submit with invalid data
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/name must be at least 2 characters/i)).toBeInTheDocument();
    });
  });

  it("shows cancel booking modal when Cancel Booking button is clicked", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: mockBooking },
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: "Cancel Booking" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText("Cancel Booking?")).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to cancel this booking/i)
      ).toBeInTheDocument();
    });
  });

  it("allows canceling a booking", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: mockBooking },
      isLoading: false,
      error: null,
    });

    mockCancelBooking.mockResolvedValueOnce({
      message: "Booking cancelled successfully",
    });

    const user = userEvent.setup();
    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
    });

    // Click Cancel Booking
    const cancelButton = screen.getByRole("button", { name: "Cancel Booking" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.getByText("Cancel Booking?")).toBeInTheDocument();
    });

    // Confirm cancellation
    const confirmButton = screen.getByRole("button", {
      name: "Yes, Cancel Booking",
    });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(mockCancelBooking).toHaveBeenCalledWith(mockToken);
      expect(mockSuccess).toHaveBeenCalled();
    });
  });

  it("hides edit and cancel options for cancelled bookings", async () => {
    const cancelledBooking: Booking = {
      ...mockBooking,
      status: "cancelled",
    };

    mockBookingData.mockReturnValue({
      data: { booking: cancelledBooking },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /edit details/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /cancel booking/i })
      ).not.toBeInTheDocument();
    });
  });

  it("hides edit and cancel options for completed bookings", async () => {
    const completedBooking: Booking = {
      ...mockBooking,
      status: "completed",
    };

    mockBookingData.mockReturnValue({
      data: { booking: completedBooking },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /edit details/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /cancel booking/i })
      ).not.toBeInTheDocument();
    });
  });

  it("displays pending status badge", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: { ...mockBooking, status: "pending" } },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
    });
  });

  it("displays confirmed status badge", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: { ...mockBooking, status: "confirmed" } },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
    });
  });

  it("displays cancelled status badge", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: { ...mockBooking, status: "cancelled" } },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });
  });

  it("displays completed status badge", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: { ...mockBooking, status: "completed" } },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
  });

  it("displays no-show status badge", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: { ...mockBooking, status: "no-show" } },
      isLoading: false,
      error: null,
    });

    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("No-show")).toBeInTheDocument();
    });
  });

  it("allows canceling edit form", async () => {
    mockBookingData.mockReturnValue({
      data: { booking: mockBooking },
      isLoading: false,
      error: null,
    });

    const user = userEvent.setup();
    render(<PublicBookingDetailsPage />);

    await waitFor(() => {
      expect(screen.getByText("Your Booking Details")).toBeInTheDocument();
    });

    // Click Edit Details
    const editButton = screen.getByRole("button", { name: /edit details/i });
    await user.click(editButton);

    // Modify a field
    const nameInput = screen.getByLabelText(/your name/i);
    await user.type(nameInput, "Modified Name");

    // Click Cancel
    const cancelButton = screen.getByRole("button", { name: /^cancel$/i });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText("Edit Your Information")).not.toBeInTheDocument();
      expect(screen.getByText("Update Booking")).toBeInTheDocument();
    });
  });
});

