import RequireAuth from "@/components/auth/RequireAuth";
import LogoutButton from "@/components/auth/LogoutButton";

export default function DashboardPage() {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white/90 backdrop-blur rounded-xl shadow-lg p-6 border border-gray-200">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Welcome to Your Dashboard! 🎉
              </h1>
              <div className="mb-6">
                <LogoutButton />
              </div>
              <p className="text-gray-800 mb-6">
                Your scheduling setup is complete. You can now start managing
                your appointments and availability.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <a
                  href="/dashboard/availability"
                  className="bg-blue-50 p-6 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">
                    📅 Manage Availability
                  </h3>
                  <p className="text-blue-700 text-sm">
                    Update your working hours and available time slots
                  </p>
                </a>

                <div className="bg-green-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">
                    📋 View Appointments
                  </h3>
                  <p className="text-green-700 text-sm">
                    See upcoming and past appointments
                  </p>
                </div>

                <div className="bg-purple-50 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-900 mb-2">
                    🔗 Share Booking Link
                  </h3>
                  <p className="text-purple-700 text-sm">
                    Share your booking link with clients
                  </p>
                </div>
              </div>

              <div className="mt-8 p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  Next Steps
                </h3>
                <ul className="text-yellow-800 text-sm space-y-1">
                  <li>• Customize your booking page</li>
                  <li>• Set up payment integration</li>
                  <li>• Configure email notifications</li>
                  <li>• Add team members (if applicable)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
