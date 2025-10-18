import Holidays from "date-holidays";

export interface HolidayInfo {
  name: string;
  date: Date;
  type: string;
  country: string;
}

export interface HolidayServiceConfig {
  country?: string;
  state?: string;
  region?: string;
  timezone?: string;
}

export class HolidayService {
  private holidays: Holidays;
  private config: HolidayServiceConfig;

  constructor(config: HolidayServiceConfig = {}) {
    this.config = {
      country: "US", // Default to US
      timezone: "UTC",
      ...config,
    };

    this.holidays = new Holidays(this.config.country!);

    // Set state/region if provided
    if (this.config.state) {
      this.holidays.setTimezone(this.config.state);
    }
    if (this.config.region) {
      this.holidays.setTimezone(this.config.region);
    }
  }

  /**
   * Check if a specific date is a holiday
   */
  isHoliday(date: Date): boolean {
    try {
      const holiday = this.holidays.isHoliday(date);
      return !!holiday;
    } catch (error) {
      console.error("Error checking if date is holiday:", error);
      return false;
    }
  }

  /**
   * Get holiday information for a specific date
   */
  getHolidayInfo(date: Date): HolidayInfo | null {
    try {
      const holiday = this.holidays.isHoliday(date);
      if (holiday && Array.isArray(holiday) && holiday.length > 0) {
        const firstHoliday = holiday[0];
        return {
          name: firstHoliday.name,
          date: new Date(date),
          type: firstHoliday.type || "public",
          country: this.config.country || "US",
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting holiday info:", error);
      return null;
    }
  }

  /**
   * Get all holidays for a specific year
   */
  getHolidaysForYear(year: number): HolidayInfo[] {
    try {
      const holidays = this.holidays.getHolidays(year);
      return holidays.map((holiday) => ({
        name: holiday.name,
        date: new Date(holiday.date),
        type: holiday.type || "public",
        country: this.config.country || "US",
      }));
    } catch (error) {
      console.error("Error getting holidays for year:", error);
      return [];
    }
  }

  /**
   * Get holidays within a date range
   */
  getHolidaysInRange(startDate: Date, endDate: Date): HolidayInfo[] {
    try {
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      const holidays: HolidayInfo[] = [];

      // Get holidays for each year in the range
      for (let year = startYear; year <= endYear; year++) {
        const yearHolidays = this.getHolidaysForYear(year);
        holidays.push(...yearHolidays);
      }

      // Filter holidays within the date range
      return holidays.filter(
        (holiday) => holiday.date >= startDate && holiday.date <= endDate
      );
    } catch (error) {
      console.error("Error getting holidays in range:", error);
      return [];
    }
  }

  /**
   * Get available countries
   */
  static getAvailableCountries(): string[] {
    try {
      const holidays = new Holidays();
      const countries = holidays.getCountries();
      return Object.keys(countries);
    } catch (error) {
      console.error("Error getting available countries:", error);
      return ["US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "JP", "CN"];
    }
  }

  /**
   * Get available states/regions for a country
   */
  getAvailableStates(): string[] {
    try {
      const states = this.holidays.getStates(this.config.country!);
      return Object.keys(states);
    } catch (error) {
      console.error("Error getting available states:", error);
      return [];
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HolidayServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };

    if (newConfig.country) {
      this.holidays = new Holidays(newConfig.country);
    }

    if (newConfig.state) {
      this.holidays.setTimezone(newConfig.state);
    }

    if (newConfig.region) {
      this.holidays.setTimezone(newConfig.region);
    }
  }
}

// Default instance for common use cases
export const defaultHolidayService = new HolidayService();

// Utility functions for easy use
export const isHoliday = (date: Date, country?: string): boolean => {
  const service = country
    ? new HolidayService({ country })
    : defaultHolidayService;
  return service.isHoliday(date);
};

export const getHolidayInfo = (
  date: Date,
  country?: string
): HolidayInfo | null => {
  const service = country
    ? new HolidayService({ country })
    : defaultHolidayService;
  return service.getHolidayInfo(date);
};

export const getHolidaysInRange = (
  startDate: Date,
  endDate: Date,
  country?: string
): HolidayInfo[] => {
  const service = country
    ? new HolidayService({ country })
    : defaultHolidayService;
  return service.getHolidaysInRange(startDate, endDate);
};
