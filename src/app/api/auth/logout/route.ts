import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
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
}
