"use client";

import { useState } from "react";
import RequireAuth from "@/components/auth/RequireAuth";
import AvailabilityCalendar from "@/components/availability/AvailabilityCalendar";
import SettingsModal from "@/components/availability/SettingsModal";

export default function AvailabilityPage() {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <RequireAuth>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="mx-auto max-w-7xl py-10 px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900">
                Manage your availability
              </h1>
              <p className="mt-1 text-gray-700">
                Set working hours and time slots clients can book.
              </p>
            </div>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-xl border border-gray-200 bg-white/80 px-4 py-2 text-gray-700 shadow-sm backdrop-blur transition-colors hover:bg-white"
              title="Settings"
            >
              <span className="hidden sm:inline">Settings</span>
              <svg
                className="ml-0 sm:ml-2 inline-block h-5 w-5 align-middle"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>

          {/* Calendar Card */}
          <div className="rounded-2xl bg-white/70 p-6 shadow-lg ring-1 ring-gray-200/60 backdrop-blur">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              Calendar
            </h2>
            <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
              <AvailabilityCalendar />
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </RequireAuth>
  );
}
