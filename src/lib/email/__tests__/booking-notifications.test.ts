/**
 * @jest-environment node
 */

const mockSend = jest.fn();

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: (...args: unknown[]) => mockSend(...args),
    },
  })),
}));

jest.mock("@sentry/nextjs", () => ({
  captureException: jest.fn(),
}));

import {
  sendBookingApprovedNotification,
  sendNewBookingRequestNotification,
} from "../booking-notifications";

const originalEnvironment = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  apiKey: process.env.RESEND_API_KEY,
  fromEmail: process.env.RESEND_FROM_EMAIL,
};

describe("booking email notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM_EMAIL =
      "Scheduler Booker <bookings@example.com>";
    process.env.NEXT_PUBLIC_APP_URL = "https://scheduler.example.com/";
    mockSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
  });

  afterAll(() => {
    const restore = (key: string, value: string | undefined) => {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    };

    restore("NEXT_PUBLIC_APP_URL", originalEnvironment.appUrl);
    restore("RESEND_API_KEY", originalEnvironment.apiKey);
    restore("RESEND_FROM_EMAIL", originalEnvironment.fromEmail);
  });

  it("sends a booking request to the scheduler with escaped client content", async () => {
    const result = await sendNewBookingRequestNotification({
      bookingId: "booking-1",
      schedulerEmail: "owner@example.com",
      schedulerName: "Taylor",
      clientName: "<Client>",
      clientEmail: "client@example.com",
      date: "2026-09-08",
      startTime: "2026-09-08T09:00:00+00:00",
      endTime: "2026-09-08T09:30:00+00:00",
      notes: "Discuss <script>alert('x')</script>",
    });

    expect(result).toEqual({ sent: true });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Scheduler Booker <bookings@example.com>",
        to: "owner@example.com",
        replyTo: "client@example.com",
        subject: "New booking request from <Client>",
        html: expect.stringContaining("&lt;script&gt;"),
        text: expect.stringContaining("Tuesday, September 8, 2026"),
      }),
      { idempotencyKey: "booking-request-booking-1" }
    );
    expect(mockSend.mock.calls[0][0].html).not.toContain("<script>");
  });

  it("sends approval to the client with their private appointment link", async () => {
    const result = await sendBookingApprovedNotification({
      bookingId: "booking-2",
      schedulerEmail: "owner@example.com",
      schedulerName: "Taylor Consulting",
      clientName: "Morgan",
      clientEmail: "morgan@example.com",
      date: "2026-09-09",
      startTime: "13:00",
      endTime: "14:00",
      accessToken: "private token",
    });

    expect(result).toEqual({ sent: true });
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "morgan@example.com",
        replyTo: "owner@example.com",
        subject: "Your appointment is confirmed",
        html: expect.stringContaining(
          "https://scheduler.example.com/booking/private%20token"
        ),
        text: expect.stringContaining("1:00 PM–2:00 PM"),
      }),
      { idempotencyKey: "booking-approved-booking-2" }
    );
  });

  it("reports a delivery error without throwing", async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: "Delivery rejected" },
    });

    const result = await sendBookingApprovedNotification({
      bookingId: "booking-3",
      clientName: "Morgan",
      clientEmail: "morgan@example.com",
      date: "2026-09-09",
      startTime: "13:00",
      endTime: "14:00",
    });

    expect(result).toEqual({ sent: false, reason: "delivery-failed" });
  });
});
