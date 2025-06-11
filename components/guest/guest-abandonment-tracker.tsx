"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"

interface GuestAbandonmentTrackerProps {
  isActive: boolean
  guestUserId?: string
  purchaseType: "booking" | "subscription" | "gift-voucher"
  currentStep: string
  formData: any
  onAbandon: (abandonmentData: AbandonmentData) => void
}

export interface AbandonmentData {
  guestUserId?: string
  purchaseType: string
  currentStep: string
  formData: any
  abandonmentReason: string
  abandonmentTime: Date
  timeSpentInModal: number
  lastInteractionTime: Date
}

export default function GuestAbandonmentTracker({
  isActive,
  guestUserId,
  purchaseType,
  currentStep,
  formData,
  onAbandon
}: GuestAbandonmentTrackerProps) {
  const { t } = useTranslation()
  const startTimeRef = useRef<Date>(new Date())
  const lastInteractionRef = useRef<Date>(new Date())
  const hasReportedRef = useRef<boolean>(false)

  // Update last interaction time on any activity
  useEffect(() => {
    if (!isActive) return

    const updateLastInteraction = () => {
      lastInteractionRef.current = new Date()
    }

    // Track various user interactions
    const events = ['click', 'keydown', 'mousemove', 'scroll', 'focusin']
    events.forEach(event => {
      document.addEventListener(event, updateLastInteraction, { passive: true })
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateLastInteraction)
      })
    }
  }, [isActive])

  // Reset tracking when modal becomes active
  useEffect(() => {
    if (isActive) {
      startTimeRef.current = new Date()
      lastInteractionRef.current = new Date()
      hasReportedRef.current = false
    }
  }, [isActive])

  // Track page unload / beforeunload
  useEffect(() => {
    if (!isActive) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasReportedRef.current) {
        const abandonmentData: AbandonmentData = {
          guestUserId,
          purchaseType,
          currentStep,
          formData,
          abandonmentReason: "page_unload_or_refresh",
          abandonmentTime: new Date(),
          timeSpentInModal: new Date().getTime() - startTimeRef.current.getTime(),
          lastInteractionTime: lastInteractionRef.current
        }
        
        // Use sendBeacon for reliable data sending on page unload
        navigator.sendBeacon('/api/guest-abandonment', JSON.stringify(abandonmentData))
        hasReportedRef.current = true
      }
    }

    const handleUnload = () => {
      if (!hasReportedRef.current) {
        const abandonmentData: AbandonmentData = {
          guestUserId,
          purchaseType,
          currentStep,
          formData,
          abandonmentReason: "page_unload",
          abandonmentTime: new Date(),
          timeSpentInModal: new Date().getTime() - startTimeRef.current.getTime(),
          lastInteractionTime: lastInteractionRef.current
        }
        
        navigator.sendBeacon('/api/guest-abandonment', JSON.stringify(abandonmentData))
        hasReportedRef.current = true
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
    }
  }, [isActive, guestUserId, purchaseType, currentStep, formData])

  // Track visibility change (tab switch, minimize, etc.)
  useEffect(() => {
    if (!isActive) return

    const handleVisibilityChange = () => {
      if (document.hidden && !hasReportedRef.current) {
        // User switched tab or minimized window
        const abandonmentData: AbandonmentData = {
          guestUserId,
          purchaseType,
          currentStep,
          formData,
          abandonmentReason: "tab_switch_or_minimize",
          abandonmentTime: new Date(),
          timeSpentInModal: new Date().getTime() - startTimeRef.current.getTime(),
          lastInteractionTime: lastInteractionRef.current
        }
        
        // Report abandonment after a delay to see if user comes back
        setTimeout(() => {
          if (document.hidden && !hasReportedRef.current) {
            onAbandon(abandonmentData)
            hasReportedRef.current = true
          }
        }, 30000) // 30 seconds delay
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isActive, guestUserId, purchaseType, currentStep, formData, onAbandon])

  // Track modal close (ESC key, overlay click, etc.)
  const reportModalClose = (reason: string) => {
    if (!hasReportedRef.current && isActive) {
      const abandonmentData: AbandonmentData = {
        guestUserId,
        purchaseType,
        currentStep,
        formData,
        abandonmentReason: reason,
        abandonmentTime: new Date(),
        timeSpentInModal: new Date().getTime() - startTimeRef.current.getTime(),
        lastInteractionTime: lastInteractionRef.current
      }
      
      onAbandon(abandonmentData)
      hasReportedRef.current = true
    }
  }

  // Track ESC key
  useEffect(() => {
    if (!isActive) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        reportModalClose('esc_key_pressed')
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isActive])

  // Expose reportModalClose for manual reporting
  useEffect(() => {
    if (isActive) {
      // Attach to window for external access
      (window as any).reportGuestAbandonment = reportModalClose
    }

    return () => {
      if ((window as any).reportGuestAbandonment) {
        delete (window as any).reportGuestAbandonment
      }
    }
  }, [isActive])

  return null // This is a utility component with no UI
} 