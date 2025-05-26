"use client"

import { SessionProvider } from "next-auth/react"
import type { ReactNode } from "react"
import { useEffect } from "react"
import { getCacheItem, CACHE_KEYS } from "@/lib/cache/client-cache"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Pre-load cached user data to improve perceived performance
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Attempt to pre-load cached user data
      const cachedUser = getCacheItem(CACHE_KEYS.USER_PROFILE)
      const cachedRole = getCacheItem(CACHE_KEYS.LAST_ACTIVE_ROLE)

      if (cachedUser) {
        // We could potentially pre-render UI elements based on cached data
        // while the actual session is being fetched
        console.log("Pre-loaded cached user data")
      }
    }
  }, [])

  return <SessionProvider>{children}</SessionProvider>
}
