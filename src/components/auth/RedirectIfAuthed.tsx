"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RedirectIfAuthedProps = {
  to?: string;
  children: React.ReactNode;
};

export default function RedirectIfAuthed({
  to = "/dashboard",
  children,
}: RedirectIfAuthedProps) {
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
          router.replace(to);
        }
      } finally {
        if (isMounted) setIsChecking(false);
      }
    }
    check();
    return () => {
      isMounted = false;
    };
  }, [router, to]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthed) return null;

  return <>{children}</>;
}
