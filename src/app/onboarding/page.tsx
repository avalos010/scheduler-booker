import OnboardingForm from "@/components/onboarding/OnboardingForm";
import RequireAuth from "@/components/auth/RequireAuth";
import RedirectIfOnboarded from "@/components/auth/RedirectIfOnboarded";

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <RedirectIfOnboarded>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
          <OnboardingForm />
        </div>
      </RedirectIfOnboarded>
    </RequireAuth>
  );
}
