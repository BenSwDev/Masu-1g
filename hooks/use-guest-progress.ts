"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/lib/translations/i18n"

export interface GuestProgress {
  id: string
  purchaseType: "booking" | "subscription" | "gift-voucher"
  currentStep: string
  guestUserId?: string
  formData: any
  timestamp: number
  initialData?: any
}

const GUEST_PROGRESS_KEY = "guest_purchase_progress"
const PROGRESS_EXPIRY_HOURS = 24

export function useGuestProgress() {
  const { t } = useTranslation()
  const [savedProgress, setSavedProgress] = useState<GuestProgress | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load saved progress from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(GUEST_PROGRESS_KEY)
      if (saved) {
        const progress: GuestProgress = JSON.parse(saved)
        
        // Check if progress is not expired
        const hoursOld = (Date.now() - progress.timestamp) / (1000 * 60 * 60)
        if (hoursOld < PROGRESS_EXPIRY_HOURS) {
          setSavedProgress(progress)
        } else {
          // Remove expired progress
          localStorage.removeItem(GUEST_PROGRESS_KEY)
        }
      }
    } catch (error) {
      console.warn("Failed to load guest progress:", error)
      // Clear corrupted data
      localStorage.removeItem(GUEST_PROGRESS_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Save progress to localStorage
  const saveProgress = useCallback((progress: Omit<GuestProgress, "timestamp">) => {
    try {
      const progressWithTimestamp: GuestProgress = {
        ...progress,
        timestamp: Date.now()
      }
      localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(progressWithTimestamp))
      setSavedProgress(progressWithTimestamp)
      return true
    } catch (error) {
      console.error("Failed to save guest progress:", error)
      return false
    }
  }, [])

  // Clear saved progress
  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(GUEST_PROGRESS_KEY)
      setSavedProgress(null)
      return true
    } catch (error) {
      console.error("Failed to clear guest progress:", error)
      return false
    }
  }, [])

  // Generate unique progress ID
  const generateProgressId = useCallback(() => {
    return `guest_progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Fallback: Create new guest progress with error handling
  const createNewProgress = useCallback(async (
    purchaseType: "booking" | "subscription" | "gift-voucher",
    initialData?: any
  ) => {
    try {
      // If there's existing progress for the same purchase type, handle it
      if (savedProgress && savedProgress.purchaseType === purchaseType) {
        // Try to cleanup any existing guest user if there are conflicts
        if (savedProgress.guestUserId) {
          try {
            await fetch(`/api/guest-cleanup/${savedProgress.guestUserId}`, {
              method: 'DELETE'
            })
          } catch (cleanupError) {
            console.warn("Failed to cleanup existing guest user:", cleanupError)
          }
        }
      }

      const newProgress: Omit<GuestProgress, "timestamp"> = {
        id: generateProgressId(),
        purchaseType,
        currentStep: "choice",
        formData: {},
        initialData
      }

      return saveProgress(newProgress) ? newProgress : null
    } catch (error) {
      console.error("Failed to create new progress:", error)
      // Complete fallback - clear everything and start fresh
      clearProgress()
      return {
        id: generateProgressId(),
        purchaseType,
        currentStep: "choice",
        formData: {}
      }
    }
  }, [savedProgress, generateProgressId, saveProgress, clearProgress])

  // Update existing progress
  const updateProgress = useCallback((updates: Partial<GuestProgress>) => {
    if (!savedProgress) return false

    const updatedProgress = {
      ...savedProgress,
      ...updates,
      timestamp: Date.now()
    }

    return saveProgress(updatedProgress)
  }, [savedProgress, saveProgress])

  // Check if current progress matches purchase type
  const hasMatchingProgress = useCallback((purchaseType: "booking" | "subscription" | "gift-voucher") => {
    return savedProgress?.purchaseType === purchaseType
  }, [savedProgress])

  // Get progress summary for display
  const getProgressSummary = useCallback(() => {
    if (!savedProgress) return null

    const stepsCompleted = savedProgress.currentStep !== "choice" ? 1 : 0
    const hasGuestUser = !!savedProgress.guestUserId
    const hasFormData = Object.keys(savedProgress.formData || {}).length > 0

    return {
      purchaseType: savedProgress.purchaseType,
      currentStep: savedProgress.currentStep,
      stepsCompleted,
      hasGuestUser,
      hasFormData,
      timeAgo: Math.floor((Date.now() - savedProgress.timestamp) / (1000 * 60)), // minutes ago
      canResume: stepsCompleted > 0 || hasGuestUser || hasFormData
    }
  }, [savedProgress])

  return {
    savedProgress,
    isLoading,
    saveProgress,
    clearProgress,
    createNewProgress,
    updateProgress,
    hasMatchingProgress,
    getProgressSummary,
    generateProgressId
  }
} 