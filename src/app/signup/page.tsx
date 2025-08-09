import SignupForm from "@/components/auth/SignupForm";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";

export default function SignupPage() {
  return (
    <RedirectIfAuthed>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-center text-3xl font-extrabold text-gray-900">
              Create your account
            </h1>
            <p className="mt-2 text-center text-sm text-gray-700">
              Sign up to get started
            </p>
          </div>
          <SignupForm />
          <div className="text-center">
            <a
              href="/login"
              className="text-blue-700 hover:text-blue-600 font-medium"
            >
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
