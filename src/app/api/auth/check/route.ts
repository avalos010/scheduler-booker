import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    console.log("🔍 Auth check: Starting authentication check");

    const supabase = await createSupabaseServerClient();
    console.log("🔍 Auth check: Supabase client created");

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    console.log("🔍 Auth check: User result:", {
      hasUser: !!user,
      hasError: !!error,
      errorMessage: error?.message,
    });

    if (error || !user) {
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
