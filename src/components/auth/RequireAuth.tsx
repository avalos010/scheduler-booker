"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect to login if not authenticated
  if (!loading && !user) {
    router.replace("/login");
    return null;
  }

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-800">
        Checking authentication...
      </div>
    );
  }

  // User is authenticated, render children
  return <>{children}</>;
}
