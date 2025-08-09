"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={isLoading}
      className="inline-flex items-center px-3 py-2 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors duration-200 cursor-pointer"
    >
      {isLoading ? "Signing out..." : "Sign out"}
    </button>
  );
}
