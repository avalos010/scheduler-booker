"use client";

import { ShareIcon } from "@heroicons/react/24/outline";
import { useSnackbar } from "@/components/snackbar";

interface ShareBookingButtonProps {
  userId: string;
}

export default function ShareBookingButton({
  userId,
}: ShareBookingButtonProps) {
  const { success } = useSnackbar();

  const handleShare = async () => {
    try {
      const bookingUrl = `${window.location.origin}/book/${userId}`;
      await navigator.clipboard.writeText(bookingUrl);
      success(
        "Booking link copied to clipboard! Share this link with your clients."
      );
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      // Fallback for older browsers or if clipboard API fails
      const textArea = document.createElement("textarea");
      textArea.value = `${window.location.origin}/book/${userId}`;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      success(
        "Booking link copied to clipboard! Share this link with your clients."
      );
    }
  };

  return (
    <button
      onClick={handleShare}
      className="group relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-b from-purple-50 to-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
    >
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-purple-600/10 p-3 ring-1 ring-purple-200">
          <ShareIcon className="h-6 w-6 text-purple-700" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Share Booking Link
          </h3>
          <p className="mt-1 text-sm text-purple-700/90">
            Click to copy your public booking link.
          </p>
        </div>
      </div>
      <div className="absolute right-4 top-4 text-purple-600/60">
        <span className="text-xs font-medium">COPY LINK</span>
      </div>
    </button>
  );
}
