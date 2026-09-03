import * as Sentry from "@sentry/nextjs";
import { Resend } from "resend";

const DEFAULT_FROM_EMAIL = "Scheduler Booker <onboarding@resend.dev>";
const PRODUCTION_APP_URL = "https://scheduler-booker.vercel.app";

interface BookingDetails {
  bookingId: string;
  clientEmail: string;
  clientName: string;
  date: string;
  endTime: string;
  notes?: string | null;
  startTime: string;
}

interface NewBookingRequestDetails extends BookingDetails {
  schedulerEmail: string;
  schedulerName?: string | null;
}

interface BookingApprovedDetails extends BookingDetails {
  accessToken?: string | null;
  schedulerEmail?: string | null;
  schedulerName?: string | null;
}

interface EmailContent {
  html: string;
  idempotencyKey: string;
  replyTo?: string;
  subject: string;
  text: string;
  to: string;
  type: "booking-approved" | "new-booking-request";
}

let resendClient: Resend | null = null;
let loggedMissingConfiguration = false;

function getAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, "");
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }

  return PRODUCTION_APP_URL;
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    if (!loggedMissingConfiguration) {
      console.warn(
        "Email notifications are disabled because RESEND_API_KEY is not configured."
      );
      loggedMissingConfiguration = true;
    }
    return null;
  }

  resendClient ??= new Resend(apiKey);
  return resendClient;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatBookingDate(date: string) {
  const parsedDate = new Date(`${date}T12:00:00Z`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsedDate);
}

function formatBookingTime(value: string) {
  const time = value.includes("T") ? value.split("T")[1] : value;
  const [hoursText, minutes = "00"] = time.split(":");
  const hours = Number(hoursText);

  if (!Number.isInteger(hours) || hours < 0 || hours > 23) {
    return value;
  }

  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.slice(0, 2)} ${period}`;
}

function bookingSummary(details: BookingDetails) {
  return {
    date: formatBookingDate(details.date),
    time: `${formatBookingTime(details.startTime)}–${formatBookingTime(
      details.endTime
    )}`,
  };
}

function emailShell({
  actionHref,
  actionLabel,
  body,
  details,
  heading,
}: {
  actionHref: string;
  actionLabel: string;
  body: string;
  details: BookingDetails;
  heading: string;
}) {
  const summary = bookingSummary(details);
  const notesRow = details.notes
    ? `<tr><td style="padding:8px 0;color:#64748b;vertical-align:top">Notes</td><td style="padding:8px 0 8px 20px;color:#0f172a">${escapeHtml(
        details.notes
      )}</td></tr>`
    : "";

  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a">
    <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(body)}</div>
    <div style="margin:0 auto;max-width:600px;padding:40px 20px">
      <div style="margin-bottom:20px;font-size:18px;font-weight:700;color:#2563eb">Scheduler Booker</div>
      <div style="border:1px solid #e2e8f0;border-radius:16px;background:#ffffff;padding:32px">
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25">${escapeHtml(
          heading
        )}</h1>
        <p style="margin:0 0 24px;color:#475569;line-height:1.6">${escapeHtml(
          body
        )}</p>
        <table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:28px">
          <tr><td style="padding:18px 0 8px;color:#64748b">Client</td><td style="padding:18px 0 8px 20px;color:#0f172a;font-weight:600">${escapeHtml(
            details.clientName
          )}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b">Date</td><td style="padding:8px 0 8px 20px;color:#0f172a">${escapeHtml(
            summary.date
          )}</td></tr>
          <tr><td style="padding:8px 0 18px;color:#64748b">Time</td><td style="padding:8px 0 18px 20px;color:#0f172a">${escapeHtml(
            summary.time
          )}</td></tr>
          ${notesRow}
        </table>
        <a href="${escapeHtml(
          actionHref
        )}" style="display:inline-block;border-radius:9px;background:#2563eb;padding:13px 20px;color:#ffffff;font-weight:700;text-decoration:none">${escapeHtml(
          actionLabel
        )}</a>
      </div>
      <p style="margin:18px 0 0;color:#94a3b8;font-size:12px;line-height:1.5">This is an automatic notification from Scheduler Booker.</p>
    </div>
  </body>
</html>`;
}

async function sendEmail(content: EmailContent) {
  const resend = getResendClient();

  if (!resend) {
    return { sent: false, reason: "not-configured" } as const;
  }

  try {
    const { error } = await resend.emails.send(
      {
        from: process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM_EMAIL,
        to: content.to,
        replyTo: content.replyTo,
        subject: content.subject,
        html: content.html,
        text: content.text,
      },
      { idempotencyKey: content.idempotencyKey }
    );

    if (error) {
      throw new Error(error.message);
    }

    return { sent: true } as const;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { service: "resend", notification: content.type },
    });
    console.error(`Unable to send ${content.type} email:`, error);
    return { sent: false, reason: "delivery-failed" } as const;
  }
}

export async function sendNewBookingRequestNotification(
  details: NewBookingRequestDetails
) {
  const summary = bookingSummary(details);
  const clientName = details.clientName.replace(/[\r\n]+/g, " ").slice(0, 100);
  const greeting = details.schedulerName
    ? `Hi ${details.schedulerName}, you have a new booking request from ${clientName}.`
    : `You have a new booking request from ${clientName}.`;
  const dashboardUrl = `${getAppUrl()}/dashboard/appointments`;

  return sendEmail({
    type: "new-booking-request",
    to: details.schedulerEmail,
    replyTo: details.clientEmail,
    subject: `New booking request from ${clientName}`,
    idempotencyKey: `booking-request-${details.bookingId}`,
    text: `${greeting}\n\nDate: ${summary.date}\nTime: ${summary.time}\nClient email: ${details.clientEmail}${
      details.notes ? `\nNotes: ${details.notes}` : ""
    }\n\nReview request: ${dashboardUrl}`,
    html: emailShell({
      heading: "New booking request",
      body: greeting,
      details,
      actionHref: dashboardUrl,
      actionLabel: "Review booking request",
    }),
  });
}

export async function sendBookingApprovedNotification(
  details: BookingApprovedDetails
) {
  const summary = bookingSummary(details);
  const scheduler = details.schedulerName || "the scheduler";
  const body = `Good news, ${details.clientName}. Your appointment with ${scheduler} has been approved.`;
  const bookingUrl = details.accessToken
    ? `${getAppUrl()}/booking/${encodeURIComponent(details.accessToken)}`
    : getAppUrl();

  return sendEmail({
    type: "booking-approved",
    to: details.clientEmail,
    replyTo: details.schedulerEmail || undefined,
    subject: "Your appointment is confirmed",
    idempotencyKey: `booking-approved-${details.bookingId}`,
    text: `${body}\n\nDate: ${summary.date}\nTime: ${summary.time}\n\nView appointment: ${bookingUrl}`,
    html: emailShell({
      heading: "Your appointment is confirmed",
      body,
      details,
      actionHref: bookingUrl,
      actionLabel: "View appointment",
    }),
  });
}
