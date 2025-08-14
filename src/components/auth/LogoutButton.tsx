"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Force a hard refresh to clear any cached state
        window.location.href = "/login";
      } else {
        const errorData = await response.json();
        console.error("Logout error:", errorData.error);
      }
    } catch (error) {
      console.error("Logout error:", error);
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
