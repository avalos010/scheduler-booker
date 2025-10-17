import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

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
      // Map Supabase error messages to user-friendly messages
      let userFriendlyMessage = "Login failed. Please try again.";

      switch (true) {
        case error.message.includes("Invalid login credentials"):
        case error.message.includes("User not found"):
        case error.message.includes("Invalid email"):
        case error.message.includes("Password"):
          userFriendlyMessage =
            "Invalid email or password. Please check your credentials and try again.";
          break;
        case error.message.includes("Email not confirmed"):
          userFriendlyMessage =
            "Please check your email and click the confirmation link before signing in.";
          break;
        case error.message.includes("Too many requests"):
          userFriendlyMessage =
            "Too many login attempts. Please wait a few minutes before trying again.";
          break;
        default:
          userFriendlyMessage = "Login failed. Please try again.";
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
      { error: "An unexpected error occurred. Please try again later." },
      { status: 500 }
    );
  }
}
