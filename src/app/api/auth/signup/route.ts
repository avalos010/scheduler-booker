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
      // Map Supabase error messages to user-friendly messages
      let userFriendlyMessage = "Sign up failed. Please try again.";

      if (error.message.includes("User already registered")) {
        userFriendlyMessage =
          "An account with this email already exists. Please try signing in instead.";
      } else if (error.message.includes("Password should be at least")) {
        userFriendlyMessage = "Password must be at least 6 characters long.";
      } else if (error.message.includes("Invalid email")) {
        userFriendlyMessage = "Please enter a valid email address.";
      } else if (error.message.includes("Signup is disabled")) {
        userFriendlyMessage =
          "Account creation is currently disabled. Please contact support.";
      } else if (error.message.includes("Email rate limit exceeded")) {
        userFriendlyMessage =
          "Too many signup attempts. Please wait a few minutes before trying again.";
      }

      return NextResponse.json({ error: userFriendlyMessage }, { status: 400 });
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
