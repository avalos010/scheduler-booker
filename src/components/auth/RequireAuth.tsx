"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RequireAuthProps = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: RequireAuthProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function check() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!isMounted) return;
        if (data?.user) {
          setIsAuthed(true);
        } else {
          router.replace("/login");
        }
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }
    check();
    return () => {
      isMounted = false;
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-800">
        Checking authentication...
      </div>
    );
  }

  if (!isAuthed) return null;

  return <>{children}</>;
}
