import SignupForm from "@/components/auth/SignupForm";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";

export default function SignupPage() {
  return (
    <RedirectIfAuthed>
      <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-center text-3xl font-extrabold text-gray-900">
              Create your account
            </h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign up to get started
            </p>
          </div>
          <SignupForm />
          <div className="text-center">
            <a
              href="/login"
              className="text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Already have an account? Sign in
            </a>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
