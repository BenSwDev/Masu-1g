import { clearAllCache, removeCacheItem, CACHE_KEYS } from "./client-cache"

/**
 * Clear all user-related cache data on logout
 */
export function clearUserCache(): void {
  removeCacheItem(CACHE_KEYS.USER_PROFILE)
  removeCacheItem(CACHE_KEYS.USER_ROLES)
  // Keep preferences and language settings
}

/**
 * Clear all cache data (used for complete logout or account deletion)
 */
export function clearAllUserData(): void {
  clearAllCache()
}

/**
 * Clear sensitive cache data (used when switching users)
 */
export function clearSensitiveCache(): void {
  removeCacheItem(CACHE_KEYS.USER_PROFILE)
  removeCacheItem(CACHE_KEYS.USER_ROLES)
  removeCacheItem(CACHE_KEYS.LAST_ACTIVE_ROLE)
}
