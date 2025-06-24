"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { getCacheItem, setCacheItem, CACHE_KEYS, CACHE_EXPIRY } from "@/lib/cache/client-cache"

// Define types for cached user data (only non-sensitive information)
export interface CachedUserProfile {
  id: string
  name: string | null | undefined
  email: string | null | undefined
  image: string | null | undefined
  roles: string[]
  activeRole: string
  lastUpdated: number
}

export function useCachedUser() {
  const { _data: session, status } = useSession()
  const [cachedProfile, setCachedProfile] = useState<CachedUserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load cached profile on initial render
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = getCacheItem<CachedUserProfile>(CACHE_KEYS.USER_PROFILE)
      if (cached) {
        setCachedProfile(cached)
      }
      setIsLoading(false)
    }
  }, [])

  // Update cache when session changes
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userProfile: CachedUserProfile = {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        roles: session.user.roles || [],
        activeRole: session.user.activeRole || "member",
        lastUpdated: Date.now(),
      }

      setCachedProfile(userProfile)
      setCacheItem(CACHE_KEYS.USER_PROFILE, userProfile, CACHE_EXPIRY.MEDIUM)

      // Cache last active role separately for quicker access
      setCacheItem(CACHE_KEYS.LAST_ACTIVE_ROLE, userProfile.activeRole, CACHE_EXPIRY.PERSISTENT)
    }
  }, [session, status])

  return {
    cachedProfile,
    isLoading,
    isAuthenticated: status === "authenticated",
    status,
  }
}
