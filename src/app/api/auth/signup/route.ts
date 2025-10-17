import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();

  try {
    const body = await request.json();
    const { email, password } = body;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      // Map Supabase error codes to user-friendly messages using error.code for reliability
      let userFriendlyMessage = "Sign up failed. Please try again.";
      let statusCode = 400;

      // Use error.code if available, fallback to error.message for exact matching
      const errorIdentifier = error.code || error.message;

      switch (errorIdentifier) {
        case "user_already_exists":
        case "User already registered":
          userFriendlyMessage =
            "An account with this email already exists. Please try signing in instead.";
          statusCode = 409; // Conflict
          break;
        case "password_too_short":
        case "Password should be at least 6 characters":
          userFriendlyMessage = "Password must be at least 6 characters long.";
          statusCode = 400; // Bad Request
          break;
        case "invalid_email":
        case "Invalid email":
          userFriendlyMessage = "Please enter a valid email address.";
          statusCode = 400; // Bad Request
          break;
        case "signup_disabled":
        case "Signup is disabled":
          userFriendlyMessage =
            "Account creation is currently disabled. Please contact support.";
          statusCode = 403; // Forbidden
          break;
        case "email_rate_limit_exceeded":
        case "Email rate limit exceeded":
          userFriendlyMessage =
            "Too many signup attempts. Please wait a few minutes before trying again.";
          statusCode = 429; // Too Many Requests
          break;
        default:
          // For any unknown errors, provide a generic message to avoid information leakage
          userFriendlyMessage = "Sign up failed. Please try again.";
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
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
