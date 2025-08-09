"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/auth/LogoutButton";

export default function Navbar() {
  const pathname = usePathname();
  const isAuthRoute =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/signup") ||
    pathname?.startsWith("/onboarding");

  const [isAuthed, setIsAuthed] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function refreshUser() {
      const { data } = await supabase.auth.getUser();
      if (!isMounted) return;
      const authed = Boolean(data?.user);
      setIsAuthed(authed);
      setUserEmail(data?.user?.email ?? null);
    }
    refreshUser();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refreshUser();
    });
    return () => {
      isMounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 border-b border-neutral-100 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={isAuthed ? "/dashboard" : "/"}
              className="inline-flex items-center gap-2 text-neutral-900 font-semibold"
            >
              <span className="text-xl">SB</span>
              <span>Scheduler Booker</span>
            </Link>
            {!isAuthRoute && isAuthed && (
              <div className="ml-4 hidden md:flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm text-neutral-700 hover:text-neutral-900"
                >
                  Dashboard
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isAuthed ? (
              !isAuthRoute ? (
                <>
                  {userEmail && (
                    <span className="hidden sm:inline text-sm text-neutral-700 rounded-full bg-neutral-100 px-3 py-1">
                      {userEmail}
                    </span>
                  )}
                  <LogoutButton />
                </>
              ) : null
            ) : (
              !isAuthRoute && (
                <>
                  <Link
                    href="/login"
                    className="text-sm text-neutral-700 hover:text-neutral-900"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="text-sm bg-emerald-600 text-white px-3 py-1.5 rounded-md hover:bg-emerald-500 transition-colors duration-200"
                  >
                    Sign up
                  </Link>
                </>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
