"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/auth/LogoutButton";
import { CalendarDaysIcon } from "@heroicons/react/24/outline";

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
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Link
              href={isAuthed ? "/dashboard" : "/"}
              className="flex items-center space-x-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <CalendarDaysIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                Scheduler Booker
              </span>
            </Link>
            {!isAuthRoute && isAuthed && (
              <div className="ml-8 hidden md:flex items-center space-x-1">
                <Link
                  href="/dashboard"
                  className={`text-sm px-4 py-2 rounded-lg transition-all duration-200 ${
                    pathname === "/dashboard"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/dashboard/availability"
                  className={`text-sm px-4 py-2 rounded-lg transition-all duration-200 ${
                    pathname === "/dashboard/availability"
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  Availability
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthed ? (
              !isAuthRoute ? (
                <>
                  {userEmail && (
                    <span className="hidden sm:inline text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg font-medium">
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
                    className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Get Started
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
