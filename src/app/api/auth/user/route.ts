import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only return safe user information
    return NextResponse.json({
      email: user.email,
      id: user.id,
    });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "auth/user/GET", type: "server" },
    });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
