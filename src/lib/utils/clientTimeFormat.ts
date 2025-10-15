"use client";

import { format, parse } from "date-fns";
import { useTimeFormat, useUpdateTimeFormat } from "@/lib/hooks/queries";

/**
 * Formats time according to specified format (12-hour AM/PM or 24-hour)
 * Client-side version for components that still need formatting
 */
export function formatTime(timeString: string, is24Hour: boolean): string {
  try {
    // Validate input
    if (!timeString || typeof timeString !== "string") {
      return "Invalid time";
    }

    // Clean and validate the time string format
    const cleanTimeString = timeString.trim();

    // Check if it's already formatted (contains AM/PM)
    if (/^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(cleanTimeString)) {
      // Already formatted, return as-is if user wants 12-hour format
      if (!is24Hour) {
        return cleanTimeString;
      }
      // Convert 12-hour to 24-hour format
      const time = parse(cleanTimeString, "h:mm a", new Date());
      if (!isNaN(time.getTime())) {
        return format(time, "HH:mm");
      }
    }

    // Check if it matches HH:mm, H:mm, HH:mm:ss, or H:mm:ss format
    if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(cleanTimeString)) {
      return timeString; // Return original if format is unexpected
    }

    // Parse the time string - handle both HH:mm and HH:mm:ss formats
    let time: Date;
    if (
      cleanTimeString.includes(":") &&
      cleanTimeString.split(":").length === 3
    ) {
      // HH:mm:ss format
      time = parse(cleanTimeString, "HH:mm:ss", new Date());
    } else {
      // HH:mm format
      time = parse(cleanTimeString, "HH:mm", new Date());
    }

    // Check if the parsed time is valid
    if (isNaN(time.getTime())) {
      // Try parsing with single-digit hour format
      let timeAlt: Date;
      if (
        cleanTimeString.includes(":") &&
        cleanTimeString.split(":").length === 3
      ) {
        timeAlt = parse(cleanTimeString, "H:mm:ss", new Date());
      } else {
        timeAlt = parse(cleanTimeString, "H:mm", new Date());
      }

      if (isNaN(timeAlt.getTime())) {
        console.warn("Failed to parse time string:", cleanTimeString);
        return timeString;
      }
      // Use the alternative parsed time
      if (is24Hour) {
        return format(timeAlt, "HH:mm");
      } else {
        return format(timeAlt, "h:mm a");
      }
    }

    if (is24Hour) {
      // Return 24-hour format
      return format(time, "HH:mm");
    } else {
      // Return 12-hour format with AM/PM
      return format(time, "h:mm a");
    }
  } catch (error) {
    console.error("Error formatting time:", error, "Input:", timeString);
    return timeString; // Return original string if parsing fails
  }
}

/**
 * Hook for managing time format preference (client-side only)
 * Now uses TanStack Query for better caching and error handling
 */
export function useTimeFormatPreference() {
  const { data: timeFormatData, isLoading, error } = useTimeFormat();
  const updateTimeFormatMutation = useUpdateTimeFormat();

  // Get the current format preference
  const is24Hour = timeFormatData ? !timeFormatData.time_format_12h : false;

  // Fallback to localStorage if API fails
  const getLocalStorageFormat = () => {
    const saved = localStorage.getItem("timeFormat24h");
    return saved !== null ? saved === "true" : false;
  };

  // Use localStorage fallback if there's an error
  const finalIs24Hour = error ? getLocalStorageFormat() : is24Hour;

  const setTimeFormat = async (format24h: boolean) => {
    // Update localStorage immediately for UI responsiveness
    localStorage.setItem("timeFormat24h", format24h.toString());

    try {
      // Update via mutation (inverts because API stores 12h preference)
      await updateTimeFormatMutation.mutateAsync(!format24h);
    } catch (error) {
      console.error("Error saving time format preference:", error);
    }
  };

  return {
    is24Hour: finalIs24Hour,
    setIs24Hour: setTimeFormat,
    isLoading,
  };
}
