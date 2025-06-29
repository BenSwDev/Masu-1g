/**
 * UNIFIED GUEST TYPES - SINGLE SOURCE OF TRUTH
 * Following ROLE OF ONE principle - one interface per guest concept
 */

export interface GuestInfo {
  firstName: string
  lastName: string
  email?: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
  
  // Booking-specific fields
  isBookingForSomeoneElse?: boolean
  
  // Recipient fields (when booking for someone else)
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  recipientBirthDate?: Date
  recipientGender?: "male" | "female" | "other"
  
  // Notification preferences
  bookerNotificationMethod?: "email" | "sms" | "both"
  bookerNotificationLanguage?: "he" | "en" | "ru"
  
  // Optional marketing consent
  marketingConsent?: boolean
  
  // Terms and conditions
  termsAccepted?: boolean
  privacyPolicyAccepted?: boolean
  
  // Additional notes
  notes?: string
}

export interface GuestAddress {
  city: string
  street: string
  streetNumber?: string
  apartment?: string
  entrance?: string
  floor?: string
  notes?: string
  doorName?: string
  buildingName?: string
  hotelName?: string
  roomNumber?: string
  otherInstructions?: string
  hasPrivateParking?: boolean
  fullAddress?: string
}

export interface GuestUserData {
  firstName: string
  lastName: string
  email?: string
  phone: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
}

export interface CreateGuestUserResult {
  success: boolean
  userId?: string
  error?: string
  existingUser?: boolean
}

export interface GuestBookingData {
  guestInfo: Partial<GuestInfo>
  guestAddress: Partial<GuestAddress>
  bookingOptions: any
  calculatedPrice: any | null
  currentStep: number
}

export interface AbandonedBookingResult {
  success: boolean
  bookingId?: string
  booking?: any
  error?: string
} 