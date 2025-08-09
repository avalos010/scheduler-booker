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

  if (isChecking) return null;

  if (isAuthed) return null;

  return <>{children}</>;
}
