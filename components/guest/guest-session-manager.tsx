"use client"

import { useEffect, useState } from "react"

export interface GuestSessionData {
  guestUserId?: string
  guestSessionId?: string
  shouldMergeWith?: string
  createdAt?: number
}

/**
 * Hook for managing guest session data
 */
export function useGuestSession() {
  const [guestSession, setGuestSession] = useState<GuestSessionData>({})

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("guestSession")
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          // Check if session is not older than 24 hours
          const now = Date.now()
          const sessionAge = now - (parsed.createdAt || 0)
          const maxAge = 24 * 60 * 60 * 1000 // 24 hours

          if (sessionAge < maxAge) {
            setGuestSession(parsed)
          } else {
            // Clear expired session
            localStorage.removeItem("guestSession")
          }
        } catch (error) {
          console.warn("Failed to parse guest session:", error)
          localStorage.removeItem("guestSession")
        }
      }
    }
  }, [])

  const updateGuestSession = (data: Partial<GuestSessionData>) => {
    const updated = {
      ...guestSession,
      ...data,
      createdAt: guestSession.createdAt || Date.now(),
    }
    setGuestSession(updated)
    
    if (typeof localStorage !== "undefined") {
      localStorage.setItem("guestSession", JSON.stringify(updated))
    }
  }

  const clearGuestSession = () => {
    setGuestSession({})
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("guestSession")
    }
  }

  const hasActiveGuestSession = () => {
    return !!(guestSession.guestUserId && guestSession.guestSessionId)
  }

  return {
    guestSession,
    updateGuestSession,
    clearGuestSession,
    hasActiveGuestSession,
  }
} 