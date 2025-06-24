"use client"

import type { 
  TimeSlot, 
  CalculatedPriceDetails,
  PopulatedBooking,
  BookingStatus
} from "@/types/booking"
import type { IBooking } from "@/lib/db/models/booking"
import type { z } from "zod"

export type { IGiftVoucherUsageHistory } from "@/types/booking"

// ============================================================================
// USER BOOKINGS
// ============================================================================

export async function getUserBookings(
  userId: string,
  filters: {
    status?: string
    treatment?: string
    dateRange?: string
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortDirection?: "asc" | "desc"
  },
): Promise<{ bookings: PopulatedBooking[]; totalPages: number; totalBookings: number }> {
  try {
    const params = new URLSearchParams({ 
      userId, 
      ...Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    })
    
    const response = await fetch(`/api/bookings?${params}`)
    const result = await response.json()
    
    if (!result.success) {
      console.error('Failed to fetch user bookings:', result.error)
      return { bookings: [], totalPages: 0, totalBookings: 0 }
    }
    
    return result
  } catch (error) {
    console.error('Error fetching user bookings:', error)
    return { bookings: [], totalPages: 0, totalBookings: 0 }
  }
}

// ============================================================================
// ADMIN BOOKINGS
// ============================================================================

export async function getAllBookings(
  filters: {
    status?: string
    professional?: string
    treatment?: string
    dateRange?: string
    priceRange?: string
    address?: string
    page?: number
    limit?: number
    sortBy?: string
    sortDirection?: "asc" | "desc"
    search?: string
  } = {},
): Promise<{ bookings: PopulatedBooking[]; totalPages: number; totalBookings: number }> {
  try {
    const params = new URLSearchParams(
      Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== undefined).map(([k, v]) => [k, String(v)])
      )
    )
    
    const response = await fetch(`/api/admin/bookings?${params}`)
    const result = await response.json()
    
    if (!result.success) {
      console.error('Failed to fetch admin bookings:', result.error)
      return { bookings: [], totalPages: 0, totalBookings: 0 }
    }
    
    return result
  } catch (error) {
    console.error('Error fetching admin bookings:', error)
    return { bookings: [], totalPages: 0, totalBookings: 0 }
  }
}

export async function getBookingById(bookingId: string): Promise<{ success: boolean; booking?: PopulatedBooking; error?: string }> {
  try {
    const response = await fetch(`/api/admin/bookings/${bookingId}`)
    const result = await response.json()
    
    return result
  } catch (error) {
    console.error('Error fetching booking by ID:', error)
    return { success: false, error: 'Failed to fetch booking' }
  }
}

export async function updateBookingByAdmin(
  bookingId: string,
  updates: {
    status?: BookingStatus
    bookingDateTime?: Date
    recipientName?: string
    recipientPhone?: string
    recipientEmail?: string
    notes?: string
    professionalId?: string
    paymentStatus?: "pending" | "paid" | "failed" | "not_required"
  }
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  try {
    const response = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error updating booking:', error)
    return { success: false, error: 'Failed to update booking' }
  }
}

// ============================================================================
// INITIAL DATA
// ============================================================================

export async function getBookingInitialData(userId?: string): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = userId 
      ? `/api/bookings/initial-data?userId=${userId}`
      : '/api/bookings/initial-data'
    
    const response = await fetch(url)
    const result = await response.json()
    
    return result
  } catch (error) {
    console.error('Error fetching initial booking data:', error)
    return { 
      success: false, 
      error: "bookings.errors.initialDataFetchFailed" 
    }
  }
}

export async function getGuestBookingInitialData(): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await fetch('/api/bookings/guest/initial-data')
    const result = await response.json()
    
    return result
  } catch (error) {
    console.error('Error fetching guest booking data:', error)
    return { 
      success: false, 
      error: "Failed to load booking data" 
    }
  }
}

// ============================================================================
// TIME SLOTS
// ============================================================================

export async function getAvailableTimeSlots(
  dateString: string,
  treatmentId: string,
  selectedDurationId?: string,
): Promise<{ success: boolean; timeSlots?: TimeSlot[]; error?: string; workingHoursNote?: string }> {
  try {
    const params = new URLSearchParams({ 
      dateString, 
      treatmentId,
      ...(selectedDurationId && { selectedDurationId })
    })
    
    const response = await fetch(`/api/bookings/time-slots?${params}`)
    const result = await response.json()
    
    return result
  } catch (error) {
    console.error('Error fetching time slots:', error)
    return { 
      success: false, 
      error: "bookings.errors.fetchTimeSlotsFailed" 
    }
  }
}

// ============================================================================
// PRICE CALCULATION
// ============================================================================

export async function calculateBookingPrice(
  payload: unknown,
): Promise<{ success: boolean; priceDetails?: CalculatedPriceDetails; error?: string; issues?: z.ZodIssue[] }> {
  try {
    const response = await fetch('/api/bookings/price', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error calculating price:', error)
    return { 
      success: false, 
      error: "bookings.errors.calculatePriceFailed" 
    }
  }
}

// ============================================================================
// BOOKING CREATION
// ============================================================================

export async function createBooking(
  payload: unknown,
): Promise<{ success: boolean; booking?: IBooking; error?: string; issues?: z.ZodIssue[] }> {
  try {
    const response = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error creating booking:', error)
    return { 
      success: false, 
      error: "bookings.errors.createBookingFailed" 
    }
  }
}

export async function createGuestBooking(
  payload: unknown,
): Promise<{ success: boolean; booking?: IBooking; error?: string; issues?: z.ZodIssue[] }> {
  try {
    const response = await fetch('/api/bookings/guest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error creating guest booking:', error)
    return { 
      success: false, 
      error: "bookings.errors.createBookingFailed" 
    }
  }
}

// ============================================================================
// BOOKING MANAGEMENT
// ============================================================================

export async function cancelBooking(
  bookingId: string,
  userId: string,
  cancelledByRole: "user" | "admin",
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, cancelledByRole, reason }),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return { 
      success: false, 
      error: "bookings.errors.cancelBookingFailed" 
    }
  }
}

// ============================================================================
// PROFESSIONAL FUNCTIONS
// ============================================================================

export async function professionalAcceptBooking(
  bookingId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error accepting booking:', error)
    return { 
      success: false, 
      error: "bookings.errors.assignProfessionalFailed" 
    }
  }
}

export async function professionalMarkEnRoute(
  bookingId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/en-route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error marking en route:', error)
    return { 
      success: false, 
      error: "bookings.errors.markEnRouteFailed" 
    }
  }
}

export async function professionalMarkCompleted(
  bookingId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error marking completed:', error)
    return { 
      success: false, 
      error: "bookings.errors.markCompletedFailed" 
    }
  }
}

// ============================================================================
// ADMIN ASSIGNMENT FUNCTIONS
// ============================================================================

export async function assignProfessionalToBooking(
  bookingId: string,
  professionalId: string,
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ professionalId }),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error assigning professional:', error)
    return { 
      success: false, 
      error: "bookings.errors.assignProfessionalFailed" 
    }
  }
}

export async function getAvailableProfessionals(): Promise<{ success: boolean; professionals?: any[]; error?: string }> {
  try {
    const response = await fetch('/api/bookings/professionals')
    const result = await response.json()
    
    return result
  } catch (error) {
    console.error('Error fetching professionals:', error)
    return { 
      success: false, 
      error: "bookings.errors.fetchProfessionalsFailed" 
    }
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function createGuestUser(guestInfo: {
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
}): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const response = await fetch('/api/bookings/guest/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestInfo),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error creating guest user:', error)
    return { 
      success: false, 
      error: "Failed to create guest user" 
    }
  }
}

export async function saveAbandonedBooking(
  userId: string,
  formData: {
    guestInfo?: any
    guestAddress?: any
    bookingOptions?: any
    calculatedPrice?: any
    currentStep: number
  }
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  try {
    const response = await fetch('/api/bookings/abandoned', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, formData }),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error saving abandoned booking:', error)
    return { 
      success: false, 
      error: "Failed to save abandoned booking" 
    }
  }
}

export async function getAbandonedBooking(userId: string): Promise<{ 
  success: boolean
  booking?: any
  error?: string 
}> {
  try {
    const response = await fetch(`/api/bookings/abandoned?userId=${userId}`)
    const result = await response.json()
    
    return result
  } catch (error) {
    console.error('Error getting abandoned booking:', error)
    return { 
      success: false, 
      error: "Failed to get abandoned booking" 
    }
  }
}

export async function updateBookingStatusAfterPayment(
  bookingId: string,
  paymentStatus: "success" | "failed",
  transactionId?: string
): Promise<{ success: boolean; booking?: IBooking; error?: string }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/payment-status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentStatus, transactionId }),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error updating payment status:', error)
    return { 
      success: false, 
      error: "Failed to update booking status" 
    }
  }
}

export async function findSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; professionals?: any[]; error?: string }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/suitable-professionals`)
    const result = await response.json()
    
    return result
  } catch (error) {
    console.error('Error finding suitable professionals:', error)
    return { 
      success: false, 
      error: "Failed to find suitable professionals" 
    }
  }
}

export async function getSuitableProfessionalsForBooking(
  bookingId: string
): Promise<{ success: boolean; professionals?: any[]; error?: string }> {
  try {
    const response = await fetch(`/api/admin/bookings/${bookingId}/suitable-professionals`)
    const result = await response.json()
    
    return result
  } catch (error) {
    console.error('Error getting suitable professionals:', error)
    return { 
      success: false, 
      error: "Failed to get suitable professionals" 
    }
  }
}

export async function sendNotificationToSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  try {
    const response = await fetch(`/api/bookings/${bookingId}/notify-professionals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error sending notifications:', error)
    return { 
      success: false, 
      error: "Failed to send notifications" 
    }
  }
}

// ============================================================================
// REDEMPTION CODE VALIDATION
// ============================================================================

export async function validateRedemptionCode(
  code: string,
  userId?: string
): Promise<{ 
  success: boolean
  redemption?: {
    type: "subscription" | "gift_voucher" | "coupon"
    data: any
  }
  error?: string 
}> {
  try {
    const response = await fetch('/api/bookings/validate-redemption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, userId }),
    })
    
    const result = await response.json()
    return result
  } catch (error) {
    console.error('Error validating redemption code:', error)
    return { 
      success: false, 
      error: "Failed to validate redemption code" 
    }
  }
}