import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const body = await request.json();
    const { email, password } = body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map Supabase error codes to user-friendly messages using error.code for reliability
      let userFriendlyMessage = "Login failed. Please try again.";
      let statusCode = 400;

      // Use error.code if available, fallback to error.message for exact matching
      const errorIdentifier = error.code || error.message;

      switch (errorIdentifier) {
        case "invalid_credentials":
        case "Invalid login credentials":
        case "User not found":
        case "Invalid email":
          userFriendlyMessage =
            "Invalid email or password. Please check your credentials and try again.";
          statusCode = 401; // Unauthorized
          break;
        case "email_not_confirmed":
        case "Email not confirmed":
          userFriendlyMessage =
            "Please check your email and click the confirmation link before signing in.";
          statusCode = 403; // Forbidden
          break;
        case "too_many_requests":
        case "Too many requests":
          userFriendlyMessage =
            "Too many login attempts. Please wait a few minutes before trying again.";
          statusCode = 429; // Too Many Requests
          break;
        default:
          // For any unknown errors, provide a generic message to avoid information leakage
          userFriendlyMessage = "Login failed. Please try again.";
          statusCode = 400; // Bad Request
      }

      return NextResponse.json(
        { error: userFriendlyMessage },
        { status: statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "auth/login/POST", type: "server" },
    });
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
