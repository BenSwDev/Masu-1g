/**
 * Client-side cache utility for storing non-sensitive user data
 * to improve performance on subsequent visits
 */

import { logger } from "@/lib/logs/logger"

// Cache keys
export const CACHE_KEYS = {
  USER_PROFILE: "masu_user_profile",
  USER_PREFERENCES: "masu_user_preferences",
  USER_ROLES: "masu_user_roles",
  LAST_ACTIVE_ROLE: "masu_last_active_role",
  UI_STATE: "masu_ui_state",
  LANGUAGE: "masu_language",
} as const

// Cache expiration times (in milliseconds)
export const CACHE_EXPIRY = {
  SHORT: 5 * 60 * 1000, // 5 minutes
  MEDIUM: 30 * 60 * 1000, // 30 minutes
  LONG: 24 * 60 * 60 * 1000, // 1 day
  PERSISTENT: 7 * 24 * 60 * 60 * 1000, // 7 days
} as const

// Cache item interface
interface CacheItem<T> {
  value: T
  expiry: number
}

/**
 * Set an item in the cache with expiration
 */
export function setCacheItem<T>(key: string, value: T, expiryTime: number = CACHE_EXPIRY.MEDIUM): void {
  if (typeof window === "undefined") return

  try {
    const item: CacheItem<T> = {
      value,
      expiry: Date.now() + expiryTime,
    }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    logger.error("Error setting cache item", { error, key })
  }
}

/**
 * Get an item from the cache, returns null if expired or not found
 */
export function getCacheItem<T>(key: string): T | null {
  if (typeof window === "undefined") return null

  try {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return null

    const item: CacheItem<T> = JSON.parse(itemStr)

    // Check if the item has expired
    if (Date.now() > item.expiry) {
      localStorage.removeItem(key)
      return null
    }

    return item.value
  } catch (error) {
    logger.error("Error getting cache item", { error, key })
    return null
  }
}

/**
 * Remove an item from the cache
 */
export function removeCacheItem(key: string): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(key)
  } catch (error) {
    logger.error("Error removing cache item", { error, key })
  }
}

/**
 * Clear all cache items with the masu_ prefix
 */
export function clearAllCache(): void {
  if (typeof window === "undefined") return

  try {
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("masu_")) {
        localStorage.removeItem(key)
      }
    })
  } catch (error) {
    logger.error("Error clearing cache", { error })
  }
}

/**
 * Update the expiry time of an existing cache item
 */
export function updateCacheExpiry<T>(key: string, newExpiryTime: number = CACHE_EXPIRY.MEDIUM): void {
  if (typeof window === "undefined") return

  try {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return

    const item: CacheItem<T> = JSON.parse(itemStr)
    item.expiry = Date.now() + newExpiryTime

    localStorage.setItem(key, JSON.stringify(item))
  } catch (error) {
    logger.error("Error updating cache expiry", { error, key })
  }
}
