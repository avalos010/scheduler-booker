import { redirect } from "next/navigation";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();

  // Get session on server side
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user is already onboarded
  const onboarded = Boolean(session.user?.user_metadata?.onboarded);

  if (onboarded) {
    console.log(
      "🔍 Onboarding: User already onboarded, redirecting to dashboard"
    );
    redirect("/dashboard");
  }

  console.log("🔍 Onboarding: User not onboarded, showing onboarding form");

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <OnboardingForm />
    </div>
  );
}
