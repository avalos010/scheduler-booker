import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    console.log("🔍 Auth check: Starting authentication check");

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    console.log("🔍 Auth check: Supabase client created");

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    console.log("🔍 Auth check: Session result:", {
      hasSession: !!session,
      hasError: !!error,
      errorMessage: error?.message,
    });

    if (error || !session) {
      console.log("🔍 Auth check: User not authenticated");
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    console.log("🔍 Auth check: User authenticated successfully");
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    console.error("🔍 Auth check: Exception occurred:", error);
    return NextResponse.json(
      { authenticated: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
