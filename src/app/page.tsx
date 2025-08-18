import Link from "next/link";
import RedirectIfAuthed from "@/components/auth/RedirectIfAuthed";
import {
  CalendarDaysIcon,
  ClockIcon,
  UserGroupIcon,
  ArrowRightIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <RedirectIfAuthed to="/dashboard">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        {/* Hero Section */}
        <div className="px-6 py-20">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Simplify Your
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {" "}
                Scheduling
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Streamline your appointment booking with our intelligent
              scheduling platform. Manage availability, automate bookings, and
              focus on what matters most.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:-translate-y-1 shadow-lg hover:shadow-xl"
              >
                Get Started
                <ArrowRightIcon className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="px-6 py-20 bg-white/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Everything you need to manage appointments
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Powerful features designed to make scheduling effortless and
                professional
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <CalendarDaysIcon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Smart Calendar
                </h3>
                <p className="text-gray-600">
                  Intelligent calendar management with customizable working
                  hours and availability settings.
                </p>
              </div>

              <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <ClockIcon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Time Management
                </h3>
                <p className="text-gray-600">
                  Flexible time slot configuration with customizable durations
                  and break management.
                </p>
              </div>

              <div className="text-center p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
                <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <UserGroupIcon className="w-8 h-8 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Client Booking
                </h3>
                <p className="text-gray-600">
                  Seamless client booking experience with automated
                  confirmations and reminders.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Why choose Scheduler Booker?
              </h2>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">Easy Setup</h3>
                    <p className="text-gray-600">
                      Get started in minutes with our intuitive interface
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Secure & Private
                    </h3>
                    <p className="text-gray-600">
                      Enterprise-grade security with end-to-end encryption
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      24/7 Availability
                    </h3>
                    <p className="text-gray-600">
                      Your booking system works around the clock
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Mobile Friendly
                    </h3>
                    <p className="text-gray-600">
                      Access your schedule from anywhere, anytime
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="px-6 py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to transform your scheduling?
            </h2>
            <p className="text-blue-100 mb-8 text-lg">
              Get started today and experience the difference
            </p>
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 transform hover:-translate-y-1 shadow-lg"
            >
              Get Started
              <ArrowRightIcon className="w-5 h-5 ml-2" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-12 bg-gray-900 text-gray-400">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-indigo-600 rounded flex items-center justify-center">
                <CalendarDaysIcon className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Scheduler Booker
              </span>
            </div>
            <p className="text-sm mb-4">
              © {new Date().getFullYear()} Scheduler Booker. All rights
              reserved.
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Terms of Service
              </a>
              <a href="#" className="hover:text-white transition-colors">
                Support
              </a>
            </div>
          </div>
        </footer>
      </div>
    </RedirectIfAuthed>
  );
}
