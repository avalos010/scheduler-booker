import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  console.log(
    "🔍 Middleware: Processing request for",
    request.nextUrl.pathname
  );

  // Debug: Log all cookies from the request
  const allCookies = request.cookies.getAll();
  console.log(
    "🔍 Middleware: All request cookies:",
    allCookies.map((c) => ({
      name: c.name,
      value: c.value.substring(0, 50) + "...",
    }))
  );

  // Look specifically for Supabase auth cookies
  const supabaseCookies = allCookies.filter((c) => c.name.includes("sb-"));
  console.log(
    "🔍 Middleware: Supabase cookies:",
    supabaseCookies.map((c) => ({
      name: c.name,
      value: c.value.substring(0, 50) + "...",
    }))
  );

  const response = NextResponse.next({
    request,
  });

  // Add cache control headers for protected routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    response.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh session if expired
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  console.log("🔍 Middleware: Supabase auth result:", {
    hasSession: !!session,
    userId: session?.user?.id,
    error: error?.message,
  });

  // If accessing protected routes without session, redirect to login
  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    console.log("🔍 Middleware: No session, redirecting to login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // If accessing auth pages with session, redirect to dashboard
  if (
    session &&
    (request.nextUrl.pathname === "/login" ||
      request.nextUrl.pathname === "/signup")
  ) {
    console.log("🔍 Middleware: Has session, redirecting to dashboard");
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If accessing onboarding with completed onboarding, redirect to dashboard
  if (
    session &&
    request.nextUrl.pathname === "/onboarding" &&
    session.user?.user_metadata?.onboarded
  ) {
    console.log(
      "🔍 Middleware: User already onboarded, redirecting to dashboard"
    );
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/onboarding"],
};
