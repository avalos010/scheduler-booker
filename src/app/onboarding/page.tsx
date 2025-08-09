import OnboardingForm from "@/components/onboarding/OnboardingForm";
import RequireAuth from "@/components/auth/RequireAuth";

export default function OnboardingPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <OnboardingForm />
      </div>
    </RequireAuth>
  );
}
