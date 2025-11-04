import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // Get the authenticated user from shared server-side Supabase client
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only return the user ID, no other sensitive info
    return NextResponse.json({ userId: user.id });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "auth/user-id/GET", type: "server" },
    });
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
