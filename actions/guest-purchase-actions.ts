"use client"

import { mergeGuestWithExistingUser, convertGuestToRealUser } from "@/actions/guest-auth-actions"

export interface GuestPurchaseCompletionData {
  guestUserId: string
  shouldMerge?: boolean
  existingUserId?: string
  purchaseType: "booking" | "subscription" | "gift-voucher"
  purchaseId: string
}

/**
 * Handle guest purchase completion and user merge/conversion
 * This should be called from client-side after successful purchase
 */
export async function handleGuestPurchaseCompletion(
  data: GuestPurchaseCompletionData
): Promise<{ success: boolean; error?: string }> {
  try {
    const { guestUserId, shouldMerge, existingUserId } = data

    if (shouldMerge && existingUserId) {
      // Merge guest with existing user
      const mergeResult = await mergeGuestWithExistingUser(guestUserId, existingUserId, data)
      if (!mergeResult.success) {
        console.warn("Failed to merge guest user after purchase", mergeResult.error)
        // Don't fail the entire flow - purchase was successful
      }
    } else {
      // Convert guest to real user
      const convertResult = await convertGuestToRealUser(guestUserId)
      if (!convertResult.success) {
        console.warn("Failed to convert guest user after purchase", convertResult.error)
        // Don't fail the entire flow - purchase was successful
      }
    }

    // Clear guest data from localStorage
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("guestUserId")
      localStorage.removeItem("shouldMergeWith")
    }

    return { success: true }
  } catch (error) {
    console.error("Error handling guest purchase completion:", error)
    return { success: false, error: "Failed to complete guest purchase handling" }
  }
}

/**
 * Get guest info from localStorage
 */
export function getGuestInfo(): { guestUserId?: string; shouldMergeWith?: string } {
  if (typeof localStorage === "undefined") {
    return {}
  }

  return {
    guestUserId: localStorage.getItem("guestUserId") || undefined,
    shouldMergeWith: localStorage.getItem("shouldMergeWith") || undefined,
  }
}

/**
 * Clear guest info from localStorage
 */
export function clearGuestInfo(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("guestUserId")
    localStorage.removeItem("shouldMergeWith")
  }
} 