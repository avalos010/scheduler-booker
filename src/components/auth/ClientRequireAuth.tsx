"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ClientRequireAuthProps = {
  children: React.ReactNode;
};

export default function ClientRequireAuth({ children }: ClientRequireAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/check", {
          method: "GET",
        });

        if (response.ok) {
          setIsAuthenticated(true);
        } else {
          router.replace("/login");
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.replace("/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-800">
        Checking authentication...
      </div>
    );
  }

  // User is authenticated, render children
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Not authenticated, will redirect
  return null;
}
