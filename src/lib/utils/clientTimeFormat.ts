"use client";

import { format, parse } from "date-fns";
import { useState, useEffect } from "react";

/**
 * Formats time according to specified format (12-hour AM/PM or 24-hour)
 * Client-side version for components that still need formatting
 */
export function formatTime(timeString: string, is24Hour: boolean): string {
  try {
    // Validate input
    if (!timeString || typeof timeString !== "string") {
      console.warn("Invalid time string:", timeString);
      return "Invalid time";
    }

    // Clean and validate the time string format
    const cleanTimeString = timeString.trim();

    // Check if it matches HH:mm, H:mm, HH:mm:ss, or H:mm:ss format
    if (!/^\d{1,2}:\d{2}(:\d{2})?$/.test(cleanTimeString)) {
      console.warn(
        "Time string doesn't match expected format (HH:mm or HH:mm:ss):",
        cleanTimeString
      );
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
 * Syncs with database via API
 */
export function useTimeFormatPreference() {
  const [is24Hour, setIs24Hour] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load preference from API on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const response = await fetch("/api/user/time-format");
        if (response.ok) {
          const data = await response.json();
          const format24h = !data.time_format_12h; // Invert because API stores 12h preference
          console.log("🔍 Time format preference loaded:", {
            apiResponse: data,
            time_format_12h: data.time_format_12h,
            computed24h: format24h,
          });
          setIs24Hour(format24h);
          localStorage.setItem("timeFormat24h", format24h.toString());
        } else {
          // Fallback to localStorage if API fails
          const saved = localStorage.getItem("timeFormat24h");
          if (saved !== null) {
            setIs24Hour(saved === "true");
          }
        }
      } catch (error) {
        console.error("Error loading time format preference:", error);
        // Fallback to localStorage
        const saved = localStorage.getItem("timeFormat24h");
        if (saved !== null) {
          setIs24Hour(saved === "true");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPreference();
  }, []);

  const setTimeFormat = async (format24h: boolean) => {
    setIs24Hour(format24h);
    localStorage.setItem("timeFormat24h", format24h.toString());

    // Save to database via API
    try {
      const response = await fetch("/api/user/time-format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          time_format_12h: !format24h, // Invert because API stores 12h preference
        }),
      });

      if (!response.ok) {
        console.error("Failed to save time format preference to database");
      }
    } catch (error) {
      console.error("Error saving time format preference:", error);
    }
  };

  return {
    is24Hour,
    setIs24Hour: setTimeFormat,
    isLoading,
  };
}
