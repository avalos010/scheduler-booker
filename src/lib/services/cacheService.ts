import type {
  DayAvailability,
  WorkingHours,
  AvailabilitySettings,
  CachedAvailabilityData,
} from "../types/availability";
import {
  saveToCache,
  loadFromCache,
  clearCache,
  updateCacheAvailability,
  updateCacheWorkingHours,
  updateCacheSettings,
} from "@/lib/cache-utils";

export class CacheService {
  /**
   * Load cached availability data for a user
   */
  static loadFromCache(userId: string): CachedAvailabilityData | null {
    return loadFromCache(userId);
  }

  /**
   * Save availability data to cache
   */
  static saveToCache(
    userId: string,
    data: {
      availability: Record<string, DayAvailability>;
      workingHours: WorkingHours[];
      settings: AvailabilitySettings;
      exceptions?: Record<string, { isWorkingDay: boolean; reason?: string }>;
    }
  ): void {
    saveToCache(userId, data);
  }

  /**
   * Clear all cached data for a user
   */
  static clearCache(userId: string): void {
    clearCache(userId);
  }

  /**
   * Update only availability data in cache
   */
  static updateAvailability(
    userId: string,
    availability: Record<string, DayAvailability>
  ): void {
    updateCacheAvailability(userId, availability);
  }

  /**
   * Update only working hours in cache
   */
  static updateWorkingHours(
    userId: string,
    workingHours: WorkingHours[]
  ): void {
    updateCacheWorkingHours(userId, workingHours);
  }

  /**
   * Update only settings in cache
   */
  static updateSettings(userId: string, settings: AvailabilitySettings): void {
    updateCacheSettings(userId, settings);
  }

  /**
   * Check if cache exists and is valid for a user
   */
  static isCacheValid(userId: string): boolean {
    const cached = this.loadFromCache(userId);
    return cached !== null;
  }
}
