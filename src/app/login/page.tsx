import LoginForm from "@/components/auth/LoginForm";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";

export default function LoginPage() {
  return (
    <RedirectIfAuthed>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h1 className="text-center text-3xl font-extrabold text-gray-900">
              Welcome back
            </h1>
            <p className="mt-2 text-center text-sm text-gray-700">
              Sign in to your account
            </p>
          </div>
          <LoginForm />
          <div className="text-center">
            <a
              href="/signup"
              className="text-blue-700 hover:text-blue-600 font-medium"
            >
              Don&apos;t have an account? Sign up
            </a>
          </div>
        </div>
      </div>
    </RedirectIfAuthed>
  );
}
