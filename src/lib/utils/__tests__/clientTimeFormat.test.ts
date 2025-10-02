import { formatTime } from "../clientTimeFormat";

describe("formatTime", () => {
  describe("24-hour format", () => {
    it("should format valid time strings correctly", () => {
      expect(formatTime("09:30", true)).toBe("09:30");
      expect(formatTime("14:45", true)).toBe("14:45");
      expect(formatTime("23:59", true)).toBe("23:59");
      expect(formatTime("00:00", true)).toBe("00:00");
    });

    it("should handle single-digit hours", () => {
      expect(formatTime("9:30", true)).toBe("09:30");
      expect(formatTime("1:45", true)).toBe("01:45");
    });
  });

  describe("12-hour format", () => {
    it("should format valid time strings correctly", () => {
      expect(formatTime("09:30", false)).toBe("9:30 AM");
      expect(formatTime("14:45", false)).toBe("2:45 PM");
      expect(formatTime("00:00", false)).toBe("12:00 AM");
      expect(formatTime("12:00", false)).toBe("12:00 PM");
    });

    it("should handle single-digit hours", () => {
      expect(formatTime("9:30", false)).toBe("9:30 AM");
      expect(formatTime("1:45", false)).toBe("1:45 AM");
    });
  });

  describe("error handling", () => {
    it("should handle invalid time strings gracefully", () => {
      expect(formatTime("", true)).toBe("Invalid time");
      expect(formatTime("invalid", true)).toBe("invalid");
      expect(formatTime("25:00", true)).toBe("25:00"); // Invalid hour
      expect(formatTime("12:99", true)).toBe("12:99"); // Invalid minute
      expect(formatTime("not:time", true)).toBe("not:time");
    });

    it("should handle null/undefined values", () => {
      expect(formatTime(null as unknown as string, true)).toBe("Invalid time");
      expect(formatTime(undefined as unknown as string, true)).toBe("Invalid time");
    });

    it("should handle whitespace", () => {
      expect(formatTime(" 09:30 ", true)).toBe("09:30");
      expect(formatTime("  14:45  ", false)).toBe("2:45 PM");
    });
  });
});
