import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            Welcome back
          </h1>
          <p className="mt-2 text-center text-sm text-gray-800">
            Sign in to your account
          </p>
        </div>
        <LoginForm />
        <div className="text-center">
          <a href="/signup" className="text-blue-600 hover:text-blue-500">
            Don't have an account? Sign up
          </a>
        </div>
      </div>
    </div>
  );
}
