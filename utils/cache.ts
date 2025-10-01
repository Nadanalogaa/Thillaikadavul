/**
 * Cache utility for optimizing API calls and reducing costs
 *
 * This utility provides localStorage-based caching with TTL (Time To Live)
 * to minimize redundant API calls to Supabase.
 */

export interface CacheOptions {
  key: string;
  duration: number; // in milliseconds
}

export interface CacheData<T> {
  data: T;
  timestamp: number;
}

/**
 * Get data from cache
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export function getFromCache<T>(key: string): T | null {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return null;

    const { data, timestamp } = JSON.parse(cachedData) as CacheData<T>;
    return data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    localStorage.removeItem(key);
    return null;
  }
}

/**
 * Check if cache is valid (not expired)
 * @param key Cache key
 * @param duration Cache duration in milliseconds
 * @returns true if cache is valid, false otherwise
 */
export function isCacheValid(key: string, duration: number): boolean {
  try {
    const cachedData = localStorage.getItem(key);
    if (!cachedData) return false;

    const { timestamp } = JSON.parse(cachedData) as CacheData<any>;
    const isExpired = Date.now() - timestamp > duration;
    return !isExpired;
  } catch (error) {
    console.error('Error checking cache validity:', error);
    return false;
  }
}

/**
 * Set data in cache
 * @param key Cache key
 * @param data Data to cache
 */
export function setInCache<T>(key: string, data: T): void {
  try {
    const cacheData: CacheData<T> = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error writing to cache:', error);
  }
}

/**
 * Clear cache by key
 * @param key Cache key
 */
export function clearCache(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Clear all caches with a specific prefix
 * @param prefix Cache key prefix
 */
export function clearCacheByPrefix(prefix: string): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing cache by prefix:', error);
  }
}

/**
 * Get or fetch data with caching
 * @param key Cache key
 * @param duration Cache duration in milliseconds
 * @param fetchFn Function to fetch data if cache is invalid
 * @returns Cached or freshly fetched data
 */
export async function getOrFetch<T>(
  key: string,
  duration: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  // Check cache first
  if (isCacheValid(key, duration)) {
    const cached = getFromCache<T>(key);
    if (cached !== null) {
      return cached;
    }
  }

  // Fetch fresh data
  const data = await fetchFn();
  setInCache(key, data);
  return data;
}

// Common cache keys
export const CACHE_KEYS = {
  COURSES: 'nadanaloga_courses',
  GALLERY: 'nadanaloga_gallery',
  EVENTS: 'nadanaloga_events',
} as const;

// Common cache durations
export const CACHE_DURATIONS = {
  ONE_HOUR: 1000 * 60 * 60,
  SIX_HOURS: 1000 * 60 * 60 * 6,
  ONE_DAY: 1000 * 60 * 60 * 24,
  ONE_WEEK: 1000 * 60 * 60 * 24 * 7,
} as const;
