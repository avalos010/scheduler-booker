/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { POST } from "../route";
import { sendNewBookingRequestNotification } from "@/lib/email/booking-notifications";

const mockGetUserById = jest.fn();
const mockSingle = jest.fn();

jest.mock("@/lib/supabase-server", () => ({
  createSupabaseServiceClient: () => ({
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
      },
    },
    from: () => ({
      insert: () => ({
        select: () => ({ single: () => mockSingle() }),
      }),
    }),
  }),
}));

jest.mock("@/lib/email/booking-notifications", () => ({
  sendNewBookingRequestNotification: jest.fn(),
}));

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

const mockedNotification = jest.mocked(sendNewBookingRequestNotification);

function bookingRequest() {
  return new Request("http://localhost/api/bookings/public-create", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      userId: "owner-1",
      date: "2026-09-08",
      startTime: "09:00",
      endTime: "09:30",
      clientName: "Morgan",
      clientEmail: "morgan@example.com",
      notes: "Project kickoff",
    }),
  }) as NextRequest;
}

describe("POST /api/bookings/public-create", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({
      data: {
        id: "booking-1",
        access_token: "token-1",
      },
      error: null,
    });
    mockGetUserById.mockResolvedValue({
      data: {
        user: {
          email: "owner@example.com",
          user_metadata: { business_name: "Taylor Consulting" },
        },
      },
      error: null,
    });
    mockedNotification.mockResolvedValue({ sent: true });
  });

  it("notifies the scheduler after creating a booking", async () => {
    const response = await POST(bookingRequest());

    expect(response.status).toBe(201);
    expect(mockedNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "booking-1",
        schedulerEmail: "owner@example.com",
        schedulerName: "Taylor Consulting",
        clientEmail: "morgan@example.com",
      })
    );
  });

  it("keeps the booking successful when the owner lookup fails", async () => {
    mockGetUserById.mockResolvedValue({
      data: { user: null },
      error: new Error("Lookup failed"),
    });

    const response = await POST(bookingRequest());

    expect(response.status).toBe(201);
    expect(mockedNotification).not.toHaveBeenCalled();
  });
});
