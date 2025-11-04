import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import * as Sentry from "@sentry/nextjs";

export async function POST() {
  try {
    const cookieStore = await cookies();

    const supabase = await createSupabaseServerClient();

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create response with cleared cookies
    const response = NextResponse.json({ success: true });

    // Clear all Supabase auth cookies
    const allCookies = cookieStore.getAll();
    allCookies.forEach((cookie) => {
      if (cookie.name.includes("sb-")) {
        response.cookies.set(cookie.name, "", {
          expires: new Date(0),
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }
    });

    return response;
  } catch (error) {
    Sentry.captureException(error, {
      tags: { route: "auth/logout/POST", type: "server" },
    });
    console.error("Internal server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
