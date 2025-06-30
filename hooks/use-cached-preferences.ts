"use client"

import { useEffect, useState } from "react"
import { getCacheItem, setCacheItem, CACHE_KEYS, CACHE_EXPIRY } from "../lib/cache/client-cache"

export interface UserPreferences {
  theme: "light" | "dark" | "system"
  language: string
  sidebarCollapsed: boolean
  dashboardLayout: "default" | "compact" | "expanded"
  notifications: {
    email: boolean
    sms: boolean
    push: boolean
  }
}

const defaultPreferences: UserPreferences = {
  theme: "system",
  language: "he",
  sidebarCollapsed: false,
  dashboardLayout: "default",
  notifications: {
    email: true,
    sms: true,
    push: true,
  },
}

export function useCachedPreferences() {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences)
  const [isLoading, setIsLoading] = useState(true)

  // Load cached preferences on initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = getCacheItem<UserPreferences>(CACHE_KEYS.USER_PREFERENCES)
      if (cached) {
        setPreferences(cached)
      }
      setIsLoading(false)
    }
  }, [])

  // Update a specific preference
  const updatePreference = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value }
      setCacheItem(CACHE_KEYS.USER_PREFERENCES, updated, CACHE_EXPIRY.PERSISTENT)
      return updated
    })
  }

  // Update nested preference (for notifications)
  const updateNestedPreference = <
    K extends keyof UserPreferences,
    N extends keyof UserPreferences[K],
  >(
    key: K,
    nestedKey: N,
    value: UserPreferences[K][N]
  ) => {
    setPreferences(prev => {
      const updated = {
        ...prev,
        [key]: {
          ...(prev[key] as object),
          [nestedKey]: value,
        },
      }
      setCacheItem(CACHE_KEYS.USER_PREFERENCES, updated, CACHE_EXPIRY.PERSISTENT)
      return updated as UserPreferences
    })
  }

  return {
    preferences,
    isLoading,
    updatePreference,
    updateNestedPreference,
  }
}
