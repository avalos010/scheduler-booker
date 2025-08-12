import type {
  DayAvailability,
  WorkingHours,
  AvailabilitySettings,
  TimeSlot,
} from "./hooks/useAvailability";

export interface CachedAvailabilityData {
  availability: Record<string, DayAvailability>;
  workingHours: WorkingHours[];
  settings: AvailabilitySettings;
  exceptions: Record<string, { isWorkingDay: boolean; reason?: string }>;
  timestamp: number;
  version: string;
  userId: string;
}

const CACHE_VERSION = "1.0.0";
const CACHE_KEY_PREFIX = "scheduler_availability_";
const CACHE_EXPIRY_HOURS = 24; // Cache expires after 24 hours

export interface SerializedDayAvailability {
  date: string;
  timeSlots: TimeSlot[];
  isWorkingDay: boolean;
}

// Serialize Date objects in availability data
const serializeAvailability = (
  availability: Record<string, DayAvailability>
) => {
  const serialized: Record<string, SerializedDayAvailability> = {};
  Object.entries(availability).forEach(([key, value]) => {
    serialized[key] = {
      ...value,
      date: value.date.toISOString(),
    };
  });
  return serialized;
};

// Deserialize Date objects in availability data
const deserializeAvailability = (
  serialized: Record<string, SerializedDayAvailability>
): Record<string, DayAvailability> => {
  const deserialized: Record<string, DayAvailability> = {};
  Object.entries(serialized).forEach(([key, value]) => {
    deserialized[key] = {
      ...value,
      date: new Date(value.date),
    };
  });
  return deserialized;
};

export const getCacheKey = (userId: string): string => {
  return `${CACHE_KEY_PREFIX}${userId}`;
};

export const saveToCache = (
  userId: string,
  data: {
    availability: Record<string, DayAvailability>;
    workingHours: WorkingHours[];
    settings: AvailabilitySettings;
    exceptions?: Record<string, { isWorkingDay: boolean; reason?: string }>;
  }
): void => {
  try {
    const cacheData = {
      availability: serializeAvailability(data.availability),
      workingHours: data.workingHours,
      settings: data.settings,
      exceptions: data.exceptions || {},
      timestamp: Date.now(),
      version: CACHE_VERSION,
      userId,
    };

    localStorage.setItem(getCacheKey(userId), JSON.stringify(cacheData));
    console.log("Calendar data cached successfully");
  } catch (error) {
    console.error("Failed to save to cache:", error);
  }
};

export const loadFromCache = (
  userId: string
): CachedAvailabilityData | null => {
  try {
    const cached = localStorage.getItem(getCacheKey(userId));
    if (!cached) {
      console.log("No cached data found");
      return null;
    }

    const data = JSON.parse(cached);

    // Check cache version
    if (data.version !== CACHE_VERSION) {
      console.log("Cache version mismatch, invalidating cache");
      clearCache(userId);
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    const cacheAge = now - data.timestamp;
    const maxAge = CACHE_EXPIRY_HOURS * 60 * 60 * 1000; // Convert hours to milliseconds

    if (cacheAge > maxAge) {
      console.log("Cache expired, invalidating");
      clearCache(userId);
      return null;
    }

    // Check if cache is for the correct user
    if (data.userId !== userId) {
      console.log("Cache user mismatch, invalidating");
      clearCache(userId);
      return null;
    }

    console.log("Loaded data from cache successfully");
    return {
      ...data,
      availability: deserializeAvailability(data.availability),
    };
  } catch (error) {
    console.error("Failed to load from cache:", error);
    clearCache(userId);
    return null;
  }
};

export const clearCache = (userId: string): void => {
  try {
    localStorage.removeItem(getCacheKey(userId));
    console.log("Cache cleared successfully");
  } catch (error) {
    console.error("Failed to clear cache:", error);
  }
};

export const isCacheValid = (userId: string): boolean => {
  const cached = loadFromCache(userId);
  return cached !== null;
};

// Update specific parts of the cache without full reload
export const updateCacheAvailability = (
  userId: string,
  availability: Record<string, DayAvailability>
): void => {
  const existing = loadFromCache(userId);
  if (existing) {
    saveToCache(userId, {
      ...existing,
      availability,
    });
  }
};

export const updateCacheWorkingHours = (
  userId: string,
  workingHours: WorkingHours[]
): void => {
  const existing = loadFromCache(userId);
  if (existing) {
    saveToCache(userId, {
      ...existing,
      workingHours,
    });
  }
};

export const updateCacheSettings = (
  userId: string,
  settings: AvailabilitySettings
): void => {
  const existing = loadFromCache(userId);
  if (existing) {
    saveToCache(userId, {
      ...existing,
      settings,
    });
  }
};
