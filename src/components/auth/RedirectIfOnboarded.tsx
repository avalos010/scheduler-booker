"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type RedirectIfOnboardedProps = {
  to?: string;
  children: React.ReactNode;
};

export default function RedirectIfOnboarded({
  to = "/dashboard",
  children,
}: RedirectIfOnboardedProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function check() {
      try {
        const { data } = await supabase.auth.getUser();
        if (!isMounted) return;
        const onboarded = Boolean(data?.user?.user_metadata?.onboarded);
        if (onboarded) {
          setShouldRedirect(true);
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
  if (shouldRedirect) return null;

  return <>{children}</>;
}
