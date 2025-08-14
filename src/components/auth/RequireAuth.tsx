import { createSupabaseServerClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

type RequireAuthProps = {
  children: React.ReactNode;
};

export default async function RequireAuth({ children }: RequireAuthProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    redirect("/login");
  }

  // User is authenticated, render children
  return <>{children}</>;
}
