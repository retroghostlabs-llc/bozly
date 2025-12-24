/**
 * Timezone utilities for BOZLY
 * Handles timezone detection, conversion, and formatting
 */

/**
 * Auto-detect system timezone using JavaScript's Intl API
 * Returns IANA timezone identifier (e.g., "America/New_York")
 */
export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    // Fallback to UTC if detection fails
    return "UTC";
  }
}

/**
 * Format a date/time string in a specific timezone
 * @param date - ISO 8601 datetime string or Date object
 * @param timezone - IANA timezone identifier (e.g., "America/New_York")
 * @param format - Output format ("iso", "local", "date-only", "time-only")
 * @returns Formatted string
 */
export function formatInTimezone(
  date: string | Date,
  timezone: string,
  format: "iso" | "local" | "date-only" | "time-only" = "local"
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const parts = formatter.formatToParts(dateObj);
    const values: Record<string, string> = {};

    for (const part of parts) {
      values[part.type] = part.value;
    }

    if (format === "date-only") {
      return `${values.year}-${values.month}-${values.day}`;
    }

    if (format === "time-only") {
      return `${values.hour}:${values.minute}:${values.second}`;
    }

    if (format === "local") {
      return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} (${timezone})`;
    }

    // format === "iso"
    return dateObj.toISOString();
  } catch {
    // Fallback to ISO format if timezone conversion fails
    return dateObj.toISOString();
  }
}

/**
 * Get current time in a specific timezone
 * Note: Always returns ISO format (UTC), but the calculation uses the specified timezone
 * @param timezone - IANA timezone identifier
 * @returns Current timestamp in ISO format (for storage/comparison)
 */
export function getCurrentTimeInTimezone(_timezone: string): string {
  // Note: This function always returns current time in UTC/ISO format
  // The timezone parameter is reserved for future use where we might want
  // to return time formatted in the user's timezone instead
  return new Date().toISOString();
}

/**
 * Get local date in user's timezone (YYYY-MM-DD format)
 * Useful for daily notes, sessions, etc.
 */
export function getLocalDateString(timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * Check if a timezone string is valid
 * @param timezone - IANA timezone identifier
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of common timezones
 * Useful for prompting user to select their timezone
 */
export function getCommonTimezones(): string[] {
  return [
    "UTC",
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Anchorage",
    "Pacific/Honolulu",
    "Europe/London",
    "Europe/Paris",
    "Europe/Berlin",
    "Europe/Madrid",
    "Europe/Moscow",
    "Asia/Dubai",
    "Asia/Kolkata",
    "Asia/Bangkok",
    "Asia/Singapore",
    "Asia/Hong_Kong",
    "Asia/Tokyo",
    "Asia/Seoul",
    "Australia/Sydney",
    "Australia/Brisbane",
    "Australia/Melbourne",
    "Pacific/Auckland",
  ];
}

/**
 * Calculate offset between two timezones in hours (with minutes precision)
 * @param timezone1 - IANA timezone identifier
 * @param timezone2 - IANA timezone identifier
 * @returns Hours offset, including decimal for 30/45-minute offsets
 */
export function getTimezoneOffset(timezone1: string, timezone2: string): number {
  const now = new Date();
  const timestamp = now.getTime();

  // Get full date/time for both timezones using formatToParts for precision
  const getOffsetForTimezone = (tz: string): number => {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const values: Record<string, string> = {};
    for (const part of parts) {
      values[part.type] = part.value;
    }

    // Create a Date using these components as if they were UTC
    const asIfUTC = Date.UTC(
      parseInt(values.year, 10),
      parseInt(values.month, 10) - 1,
      parseInt(values.day, 10),
      parseInt(values.hour, 10),
      parseInt(values.minute, 10),
      parseInt(values.second, 10)
    );

    // The difference tells us the UTC offset for this timezone
    return (asIfUTC - timestamp) / (60 * 60 * 1000);
  };

  return getOffsetForTimezone(timezone2) - getOffsetForTimezone(timezone1);
}

/**
 * Get human-readable timezone offset string
 * @param timezone - IANA timezone identifier
 * @returns String like "UTC-5" or "UTC+5:30"
 */
export function getTimezoneOffsetString(timezone: string): string {
  if (timezone === "UTC") {
    return "UTC±0";
  }

  const now = new Date();
  const timestamp = now.getTime();

  // Get what the local time is in the target timezone
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(timestamp));
  const values: Record<string, string> = {};
  for (const part of parts) {
    values[part.type] = part.value;
  }

  // Create a Date as if those parts were UTC
  const year = parseInt(values.year, 10);
  const month = parseInt(values.month, 10) - 1;
  const day = parseInt(values.day, 10);
  const hour = parseInt(values.hour, 10);
  const minute = parseInt(values.minute, 10);
  const second = parseInt(values.second, 10);

  const asIfUTC = Date.UTC(year, month, day, hour, minute, second);

  // The difference between "this time as if it were UTC" and the actual UTC time
  // tells us the offset for this timezone
  const offsetMs = asIfUTC - timestamp;
  const offsetMinutes = Math.round(offsetMs / (60 * 1000));
  const offsetHours = Math.floor(offsetMinutes / 60);
  const remainingMinutes = Math.abs(offsetMinutes % 60);

  const sign = offsetHours >= 0 ? "+" : "-";
  const absHours = Math.abs(offsetHours);

  if (remainingMinutes === 0) {
    return `UTC${sign}${absHours}`;
  } else {
    return `UTC${sign}${absHours}:${String(remainingMinutes).padStart(2, "0")}`;
  }
}
