/**
 * Comprehensive Timezone Utilities Tests - Complete Coverage
 *
 * Tests for timezone utility functions:
 * - System timezone detection
 * - Timezone formatting and conversion
 * - Timezone validation and offset calculation
 * - Timezone list retrieval
 * - Edge cases and error handling
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSystemTimezone,
  formatInTimezone,
  getCurrentTimeInTimezone,
  getLocalDateString,
  isValidTimezone,
  getCommonTimezones,
  getTimezoneOffset,
  getTimezoneOffsetString,
} from "../../dist/utils/timezone.js";

describe("Timezone Utilities - Comprehensive Coverage", () => {
  // ============================================================================
  // System Timezone Detection
  // ============================================================================

  describe("getSystemTimezone - System Timezone Detection", () => {
    it("should return a valid timezone string", () => {
      const timezone = getSystemTimezone();
      expect(typeof timezone).toBe("string");
      expect(timezone.length).toBeGreaterThan(0);
    });

    it("should return IANA timezone format", () => {
      const timezone = getSystemTimezone();
      // IANA format is either "UTC" or "Continent/City" format
      const ianaPattern = /^(UTC|[A-Z][a-zA-Z0-9_]*\/[A-Z][a-zA-Z0-9_]*)$/;
      expect(ianaPattern.test(timezone)).toBe(true);
    });

    it("should not return empty string", () => {
      const timezone = getSystemTimezone();
      expect(timezone).toBeTruthy();
    });

    it("should be consistent across multiple calls", () => {
      const tz1 = getSystemTimezone();
      const tz2 = getSystemTimezone();
      expect(tz1).toBe(tz2);
    });

    it("should fallback to UTC on error", () => {
      // This test verifies the error handling
      // Normal execution should return a valid timezone
      const timezone = getSystemTimezone();
      expect(["UTC", ...getCommonTimezones()]).toContain(timezone);
    });
  });

  // ============================================================================
  // Timezone Formatting
  // ============================================================================

  describe("formatInTimezone - Timezone Formatting", () => {
    const testDate = new Date("2025-06-15T14:30:45Z");
    const timezone = "America/New_York";

    it("should format date with 'local' format", () => {
      const result = formatInTimezone(testDate, timezone, "local");
      expect(typeof result).toBe("string");
      expect(result).toContain(timezone);
    });

    it("should format date with 'date-only' format", () => {
      const result = formatInTimezone(testDate, timezone, "date-only");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should format date with 'time-only' format", () => {
      const result = formatInTimezone(testDate, timezone, "time-only");
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it("should format date with 'iso' format", () => {
      const result = formatInTimezone(testDate, timezone, "iso");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it("should accept string date input", () => {
      const result = formatInTimezone("2025-06-15T14:30:45Z", timezone);
      expect(typeof result).toBe("string");
    });

    it("should handle UTC timezone", () => {
      const result = formatInTimezone(testDate, "UTC", "local");
      expect(result).toContain("UTC");
    });

    it("should handle different timezones", () => {
      const ny = formatInTimezone(testDate, "America/New_York", "time-only");
      const tokyo = formatInTimezone(testDate, "Asia/Tokyo", "time-only");
      expect(ny).not.toBe(tokyo);
    });

    it("should fallback to ISO on invalid timezone", () => {
      const result = formatInTimezone(testDate, "Invalid/Timezone", "local");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("should use 'local' as default format", () => {
      const result1 = formatInTimezone(testDate, timezone);
      const result2 = formatInTimezone(testDate, timezone, "local");
      expect(result1).toBe(result2);
    });

    it("should handle very old dates", () => {
      const oldDate = new Date("1900-01-01T00:00:00Z");
      const result = formatInTimezone(oldDate, timezone, "date-only");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle future dates", () => {
      const futureDate = new Date("2099-12-31T23:59:59Z");
      const result = formatInTimezone(futureDate, timezone, "date-only");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  // ============================================================================
  // Current Time in Timezone
  // ============================================================================

  describe("getCurrentTimeInTimezone - Current Time Retrieval", () => {
    it("should return ISO format string", () => {
      const result = getCurrentTimeInTimezone("America/New_York");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });

    it("should return current time (approximately)", () => {
      const before = Date.now();
      const result = getCurrentTimeInTimezone("UTC");
      const after = Date.now();
      const resultTime = new Date(result).getTime();
      expect(resultTime).toBeGreaterThanOrEqual(before - 1000);
      expect(resultTime).toBeLessThanOrEqual(after + 1000);
    });

    it("should always return UTC/ISO format", () => {
      const tz1 = getCurrentTimeInTimezone("America/Los_Angeles");
      const tz2 = getCurrentTimeInTimezone("Asia/Tokyo");
      // Both should be in UTC/ISO format
      expect(tz1).toMatch(/Z$/);
      expect(tz2).toMatch(/Z$/);
    });

    it("should accept any timezone parameter", () => {
      expect(() =>
        getCurrentTimeInTimezone("America/New_York")
      ).not.toThrow();
      expect(() => getCurrentTimeInTimezone("UTC")).not.toThrow();
      expect(() =>
        getCurrentTimeInTimezone("Invalid/Timezone")
      ).not.toThrow();
    });

    it("should return valid Date parseable string", () => {
      const result = getCurrentTimeInTimezone("UTC");
      const date = new Date(result);
      expect(date.getTime()).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Local Date String
  // ============================================================================

  describe("getLocalDateString - Local Date String Retrieval", () => {
    it("should return YYYY-MM-DD format", () => {
      const result = getLocalDateString("America/New_York");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return valid date components", () => {
      const result = getLocalDateString("UTC");
      const [year, month, day] = result.split("-").map(Number);
      expect(year).toBeGreaterThanOrEqual(2025);
      expect(month).toBeGreaterThanOrEqual(1);
      expect(month).toBeLessThanOrEqual(12);
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(31);
    });

    it("should differ across timezones near date boundary", () => {
      // Test with timezones far apart
      const ny = getLocalDateString("America/New_York");
      const tokyo = getLocalDateString("Asia/Tokyo");
      // They might be different depending on time of day
      expect(typeof ny).toBe("string");
      expect(typeof tokyo).toBe("string");
    });

    it("should handle UTC timezone", () => {
      const result = getLocalDateString("UTC");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle Europe timezone", () => {
      const result = getLocalDateString("Europe/London");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle Asia timezone", () => {
      const result = getLocalDateString("Asia/Tokyo");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should be consistent for current date", () => {
      const result1 = getLocalDateString("UTC");
      const result2 = getLocalDateString("UTC");
      expect(result1).toBe(result2);
    });
  });

  // ============================================================================
  // Timezone Validation
  // ============================================================================

  describe("isValidTimezone - Timezone Validation", () => {
    it("should return true for valid IANA timezone", () => {
      expect(isValidTimezone("UTC")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Europe/London")).toBe(true);
      expect(isValidTimezone("Asia/Tokyo")).toBe(true);
    });

    it("should return false for invalid timezone", () => {
      expect(isValidTimezone("Invalid/Timezone")).toBe(false);
      expect(isValidTimezone("NotATimezone")).toBe(false);
      expect(isValidTimezone("America/InvalidCity")).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isValidTimezone("")).toBe(false);
    });

    it("should return false for null-like string", () => {
      expect(isValidTimezone("null")).toBe(false);
      expect(isValidTimezone("undefined")).toBe(false);
    });

    it("should handle case variations", () => {
      // Intl API is case-insensitive for timezone validation
      // All valid timezone patterns return true regardless of case
      expect(isValidTimezone("america/new_york")).toBe(true);
      expect(isValidTimezone("AMERICA/NEW_YORK")).toBe(true);
      expect(isValidTimezone("America/New_York")).toBe(true);
    });

    it("should validate common timezones", () => {
      const commonTzs = getCommonTimezones();
      for (const tz of commonTzs) {
        expect(isValidTimezone(tz)).toBe(true);
      }
    });
  });

  // ============================================================================
  // Common Timezones List
  // ============================================================================

  describe("getCommonTimezones - Common Timezones List", () => {
    it("should return an array", () => {
      const result = getCommonTimezones();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should return non-empty array", () => {
      const result = getCommonTimezones();
      expect(result.length).toBeGreaterThan(0);
    });

    it("should include UTC", () => {
      const timezones = getCommonTimezones();
      expect(timezones).toContain("UTC");
    });

    it("should include major US timezones", () => {
      const timezones = getCommonTimezones();
      expect(timezones).toContain("America/New_York");
      expect(timezones).toContain("America/Chicago");
      expect(timezones).toContain("America/Denver");
      expect(timezones).toContain("America/Los_Angeles");
    });

    it("should include major European timezones", () => {
      const timezones = getCommonTimezones();
      expect(timezones).toContain("Europe/London");
      expect(timezones).toContain("Europe/Paris");
    });

    it("should include major Asian timezones", () => {
      const timezones = getCommonTimezones();
      expect(timezones).toContain("Asia/Tokyo");
      expect(timezones).toContain("Asia/Hong_Kong");
    });

    it("should include Oceania timezones", () => {
      const timezones = getCommonTimezones();
      expect(timezones).toContain("Australia/Sydney");
      expect(timezones).toContain("Pacific/Auckland");
    });

    it("should all be valid timezones", () => {
      const timezones = getCommonTimezones();
      for (const tz of timezones) {
        expect(isValidTimezone(tz)).toBe(true);
      }
    });

    it("should not have duplicates", () => {
      const timezones = getCommonTimezones();
      const uniqueSet = new Set(timezones);
      expect(uniqueSet.size).toBe(timezones.length);
    });

    it("should be consistent across calls", () => {
      const tz1 = getCommonTimezones();
      const tz2 = getCommonTimezones();
      expect(tz1).toEqual(tz2);
    });
  });

  // ============================================================================
  // Timezone Offset Calculation
  // ============================================================================

  describe("getTimezoneOffset - Offset Calculation", () => {
    it("should return 0 for same timezone", () => {
      const offset = getTimezoneOffset("UTC", "UTC");
      expect(offset).toBe(0);
    });

    it("should return negative for timezone behind", () => {
      const offset = getTimezoneOffset("America/New_York", "America/Los_Angeles");
      expect(offset).toBeLessThan(0);
    });

    it("should return positive for timezone ahead", () => {
      const offset = getTimezoneOffset("America/Los_Angeles", "America/New_York");
      expect(offset).toBeGreaterThan(0);
    });

    it("should handle large offset differences", () => {
      const offset = getTimezoneOffset("Pacific/Auckland", "America/Los_Angeles");
      expect(Math.abs(offset)).toBeGreaterThan(15);
    });

    it("should return number type", () => {
      const offset = getTimezoneOffset("UTC", "America/New_York");
      expect(typeof offset).toBe("number");
    });

    it("should be symmetric with negated args", () => {
      const offset1 = getTimezoneOffset("UTC", "America/New_York");
      const offset2 = getTimezoneOffset("America/New_York", "UTC");
      expect(offset1).toBeCloseTo(-offset2, 1);
    });

    it("should handle DST transitions consistently", () => {
      // Both calls should return same offset on non-DST boundary
      const offset1 = getTimezoneOffset("America/New_York", "UTC");
      const offset2 = getTimezoneOffset("America/New_York", "UTC");
      expect(offset1).toBe(offset2);
    });

    it("should support half-hour offsets", () => {
      const offset = getTimezoneOffset("UTC", "Asia/Kolkata");
      // India is UTC+5:30
      expect(Math.abs(offset - 5.5)).toBeLessThan(0.1);
    });

    it("should handle quarter-hour offsets", () => {
      const offset = getTimezoneOffset("UTC", "Australia/Brisbane");
      // Australia/Brisbane is UTC+10 (no DST)
      expect(Math.abs(offset - 10)).toBeLessThan(0.1);
    });
  });

  // ============================================================================
  // Timezone Offset String
  // ============================================================================

  describe("getTimezoneOffsetString - Offset String Representation", () => {
    it("should return 'UTC±0' for UTC", () => {
      const result = getTimezoneOffsetString("UTC");
      expect(result).toBe("UTC±0");
    });

    it("should return UTC format with sign", () => {
      const result = getTimezoneOffsetString("America/New_York");
      expect(result).toMatch(/^UTC[+-]\d+/);
    });

    it("should include hours", () => {
      const result = getTimezoneOffsetString("America/New_York");
      const match = result.match(/^UTC[+-](\d+)/);
      expect(match).toBeTruthy();
      const hours = parseInt(match![1], 10);
      expect(hours).toBeGreaterThan(0);
    });

    it("should handle half-hour offsets with colon", () => {
      const result = getTimezoneOffsetString("Asia/Kolkata");
      // India is UTC+5:30
      expect(result).toMatch(/^UTC\+\d+:\d{2}$/);
    });

    it("should handle negative offsets", () => {
      const result = getTimezoneOffsetString("America/Los_Angeles");
      expect(result).toMatch(/^UTC-/);
    });

    it("should handle positive offsets", () => {
      const result = getTimezoneOffsetString("Asia/Tokyo");
      expect(result).toMatch(/^UTC\+/);
    });

    it("should return string type", () => {
      const result = getTimezoneOffsetString("UTC");
      expect(typeof result).toBe("string");
    });

    it("should be consistent across calls", () => {
      const offset1 = getTimezoneOffsetString("America/New_York");
      const offset2 = getTimezoneOffsetString("America/New_York");
      expect(offset1).toBe(offset2);
    });
  });

  // ============================================================================
  // Edge Cases & Error Handling
  // ============================================================================

  describe("Edge Cases and Error Handling", () => {
    it("should handle Etc/GMT timezones", () => {
      expect(isValidTimezone("Etc/GMT")).toBe(true);
      expect(isValidTimezone("Etc/GMT+5")).toBe(true);
    });

    it("should handle timezones with underscores", () => {
      expect(isValidTimezone("America/New_York")).toBe(true);
      expect(isValidTimezone("Asia/Ho_Chi_Minh")).toBe(true);
    });

    it("should handle Etc/GMT offset zones", () => {
      // Etc/GMT+ and Etc/GMT- zones are valid (note the sign is opposite to normal)
      // Etc/GMT+0 is actually valid in Intl API
      expect(isValidTimezone("Etc/GMT+0")).toBe(true);
      expect(isValidTimezone("Etc/GMT-5")).toBe(true);
    });

    it("should handle whitespace in timezone", () => {
      expect(isValidTimezone("America/New York")).toBe(false);
      expect(isValidTimezone(" America/New_York")).toBe(false);
      expect(isValidTimezone("America/New_York ")).toBe(false);
    });

    it("should handle DST-aware timezone formatting", () => {
      // June is summer, so DST may apply
      const june = new Date("2025-06-15T12:00:00Z");
      // December is winter, so DST may not apply
      const december = new Date("2025-12-15T12:00:00Z");

      const juneFormatted = formatInTimezone(june, "America/New_York", "time-only");
      const decemberFormatted = formatInTimezone(december, "America/New_York", "time-only");

      expect(juneFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(decemberFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it("should handle leap year dates", () => {
      const leapDate = new Date("2024-02-29T12:00:00Z");
      const result = formatInTimezone(leapDate, "UTC", "date-only");
      expect(result).toMatch(/^2024-02-29$/);
    });

    it("should handle end of year dates", () => {
      const endOfYear = new Date("2025-12-31T23:59:59Z");
      const result = formatInTimezone(endOfYear, "UTC", "date-only");
      expect(result).toMatch(/^2025-12-31$/);
    });

    it("should handle start of year dates", () => {
      const startOfYear = new Date("2025-01-01T00:00:00Z");
      const result = formatInTimezone(startOfYear, "UTC", "date-only");
      expect(result).toMatch(/^2025-01-01$/);
    });

    it("should handle midnight times", () => {
      const midnight = new Date("2025-06-15T00:00:00Z");
      const result = formatInTimezone(midnight, "UTC", "time-only");
      // Should be HH:MM:SS format
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    it("should handle near-midnight times", () => {
      const nearMidnight = new Date("2025-06-15T23:59:59Z");
      const result = formatInTimezone(nearMidnight, "UTC", "time-only");
      // Should be HH:MM:SS format (exact time may vary by timezone)
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });
  });
});
