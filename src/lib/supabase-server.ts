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
    auth: {
      // Prevent auto-refresh errors from bubbling up for invalid tokens
      detectSessionInUrl: false,
      flowType: "pkce",
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

// Service Role Supabase instance (for bypassing RLS)
// IMPORTANT: This should ONLY be used in server-side routes where you need to bypass RLS.
// Never expose this client or its key to the client-side.
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export function createSupabaseServiceClient() {
  return createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      // No need for cookie handling with service role
      getAll() {
        return [];
      },
      setAll() {
        // No need to set cookies
      },
    },
    auth: {
      // Bypasses RLS by acting as a service role
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
