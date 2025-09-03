import { format, parse } from "date-fns";

/**
 * Extracts time portion from timestamp string
 * Converts "2025-09-04T09:00:00+00:00" to "09:00:00"
 */
export function extractTimeFromTimestamp(timestamp: string): string {
  if (!timestamp || typeof timestamp !== "string") {
    return timestamp;
  }

  if (timestamp.includes("T")) {
    // Extract time portion from ISO timestamp
    const extracted = timestamp.split("T")[1].split("+")[0].split(".")[0];
    // Convert HH:MM:SS to HH:MM format to match generated slots
    const timeOnly = extracted.split(":").slice(0, 2).join(":");
    console.log("🔥 extractTimeFromTimestamp:", {
      input: timestamp,
      extracted,
      timeOnly,
    });
    return timeOnly;
  }

  // Already a time string, return as-is
  console.log("🔥 extractTimeFromTimestamp (already time string):", timestamp);
  return timestamp;
}

/**
 * Formats time according to specified format (12-hour AM/PM or 24-hour)
 * Server-safe version without React hooks
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
 * Formats a Date object according to specified format
 */
export function formatTimeFromDate(date: Date, is24Hour: boolean): string {
  try {
    if (is24Hour) {
      return format(date, "HH:mm");
    } else {
      return format(date, "h:mm a");
    }
  } catch (error) {
    console.error("Error formatting time from date:", error);
    return date.toLocaleTimeString(); // Fallback
  }
}
