"use client";

import { useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import AvailabilitySettings from "./AvailabilitySettings";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal - Mobile responsive with proper spacing */}
      <div className="flex min-h-full items-start justify-center p-2 sm:p-4 pt-4 sm:pt-8 pb-4 sm:pb-8">
        <div className="relative w-full max-w-4xl bg-white rounded-xl sm:rounded-2xl shadow-2xl my-2 sm:my-8">
          {/* Header - Mobile responsive */}
          <div className="sticky top-0 z-10 flex items-center justify-between p-3 sm:p-6 border-b border-gray-200 bg-white rounded-t-xl sm:rounded-t-2xl">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              Availability Settings
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Content - Mobile responsive padding */}
          <div className="p-3 sm:p-6">
            <AvailabilitySettings />
          </div>

          {/* Footer - Mobile responsive */}
          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 sm:gap-3 p-3 sm:p-6 border-t border-gray-200 bg-white rounded-b-xl sm:rounded-b-2xl">
            <button
              onClick={onClose}
              className="px-3 sm:px-4 py-2 text-sm sm:text-base text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
