import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper function to get cookies
async function getCookieStore() {
  return await cookies();
}

// Shared server-side Supabase instance
export async function getSupabaseServerClient() {
  const cookieStore = await getCookieStore();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// Backward compatibility - keep the old function name
export const createSupabaseServerClient = getSupabaseServerClient;

// Middleware Supabase instance (for middleware)
export function createSupabaseMiddlewareClient(requestCookies: {
  getAll: () => { name: string; value: string }[];
}) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return requestCookies.getAll();
      },
      setAll() {
        // Middleware cookies are handled differently
        // This is just for reading cookies in middleware
      },
    },
  });
}
