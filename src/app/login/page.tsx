import { Metadata } from "next";
import LoginForm from "@/components/auth/LoginForm";
import { LockClosedIcon } from "@heroicons/react/24/outline";

export const metadata: Metadata = {
  title: "Sign In - Access Your Scheduling Dashboard",
  description:
    "Sign in to your Scheduler Booker account to manage your appointments, availability, and client bookings. Secure authentication for professionals.",
  keywords: [
    "login",
    "sign in",
    "scheduling dashboard",
    "appointment management",
    "professional login",
    "booking system access",
  ],
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "Sign In - Scheduler Booker",
    description:
      "Sign in to your Scheduler Booker account to manage your appointments, availability, and client bookings.",
    url: "https://scheduler-booker.vercel.app/login",
  },
  alternates: {
    canonical: "/login",
  },
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
            <LockClosedIcon className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">
            Sign in to your account to continue managing your schedule
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/20 p-8">
          <LoginForm />
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-600">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="text-blue-600 hover:text-blue-500 font-semibold transition-colors"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
