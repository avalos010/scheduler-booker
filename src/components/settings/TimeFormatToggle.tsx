"use client";

import { ClockIcon } from "@heroicons/react/24/outline";
import { useTimeFormatPreference } from "@/lib/utils/clientTimeFormat";

export default function TimeFormatToggle() {
  const { is24Hour, setIs24Hour } = useTimeFormatPreference();

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ClockIcon className="w-5 h-5 text-gray-500" />
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Time Format
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Choose between 12-hour (AM/PM) or 24-hour format
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span
            className={`text-sm ${
              !is24Hour ? "text-blue-600 font-medium" : "text-gray-500"
            }`}
          >
            12h
          </span>
          <button
            onClick={() => setIs24Hour(!is24Hour)}
            className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              is24Hour ? "bg-blue-500" : "bg-gray-300"
            }`}
            aria-label={`Switch to ${is24Hour ? "12-hour" : "24-hour"} format`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 transform ${
                is24Hour ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
          <span
            className={`text-sm ${
              is24Hour ? "text-blue-600 font-medium" : "text-gray-500"
            }`}
          >
            24h
          </span>
        </div>
      </div>

      {/* Example display */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span>Example:</span>
          <div className="flex space-x-3">
            <span className={!is24Hour ? "font-medium text-blue-600" : ""}>
              2:30 PM
            </span>
            <span className="text-gray-400">|</span>
            <span className={is24Hour ? "font-medium text-blue-600" : ""}>
              14:30
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
