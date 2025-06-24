import { z } from "zod"

// Only import City model on server side
let City: any = null
if (typeof window === 'undefined') {
  // Dynamic import only on server side to prevent client-side loading
  City = require("@/lib/db/models/city-distance").City
}

// Cache for active cities
let activeCitiesCache: Set<string> | null = null
let cacheTimestamp: number = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

/**
 * Get active cities from database with caching
 */
async function getActiveCities(): Promise<Set<string>> {
  // Return empty set on client side
  if (typeof window !== 'undefined') {
    return new Set()
  }

  const now = Date.now()
  
  // Use cache if it's still valid
  if (activeCitiesCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return activeCitiesCache
  }
  
  try {
    if (!City) {
      return new Set()
    }
    const cities = await City.find({ isActive: true }).select('name').lean()
    activeCitiesCache = new Set(cities.map(city => city.name))
    cacheTimestamp = now
    return activeCitiesCache
  } catch (error) {
    console.error("Error fetching active cities:", error)
    // If DB query fails, return empty set to be safe
    return new Set()
  }
}

/**
 * Clear the cities cache (useful when cities are added/updated)
 */
export function clearCitiesCache(): void {
  activeCitiesCache = null
  cacheTimestamp = 0
}

/**
 * Zod schema for validating city names against active cities in database
 */
export const citySchema = z.string()
  .min(1, { message: "City is required" })
  .refine(async (cityName) => {
    const activeCities = await getActiveCities()
    return activeCities.has(cityName)
  }, {
    message: "העיר שנבחרה אינה פעילה במערכת. אנא בחר עיר מהרשימה הזמינה",
  })

/**
 * Sync version of city validation (for cases where async is not possible)
 * This should be used sparingly and only when the cache is already populated
 */
export function validateCitySync(cityName: string): boolean {
  if (!activeCitiesCache) {
    console.warn("Cities cache not populated. Use async validation instead.")
    return false
  }
  return activeCitiesCache.has(cityName)
}

/**
 * Preload cities cache (useful for initialization)
 */
export async function preloadCitiesCache(): Promise<void> {
  await getActiveCities()
}

/**
 * Get all active city names (useful for dropdowns)
 */
export async function getActiveCityNames(): Promise<string[]> {
  const activeCities = await getActiveCities()
  return Array.from(activeCities).sort()
} 