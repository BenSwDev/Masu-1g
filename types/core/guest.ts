/**
 * UNIFIED GUEST TYPES - SINGLE SOURCE OF TRUTH
 * Following ROLE OF ONE principle - one interface per guest concept
 */

export interface GuestInfo {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  birthDate?: Date
  gender?: "male" | "female" | "other"
  
  // Booking for someone else fields
  isBookingForSomeoneElse?: boolean
  recipientName?: string
  recipientFirstName?: string
  recipientLastName?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientBirthDate?: Date
  recipientGender?: "male" | "female" | "other"
  
  // Notification preferences
  bookerNotificationMethod?: "email" | "sms" | "both"
  bookerNotificationLanguage?: string
  recipientNotificationMethod?: "email" | "sms" | "both"
  recipientNotificationMethods?: "email" | "sms" | "both"
  
  // Optional marketing consent
  marketingConsent?: boolean
  
  // Terms and conditions
  termsAccepted?: boolean
  privacyPolicyAccepted?: boolean
  
  // Additional notes
  notes?: string
}

export interface GuestAddress {
  city?: string
  street?: string
  streetNumber?: string
  houseNumber?: string
  apartment?: string
  apartmentNumber?: string
  entrance?: string
  floor?: string
  notes?: string
  
  // Address type specific fields
  addressType?: "house" | "apartment" | "office" | "hotel" | "other"
  doorName?: string
  buildingName?: string
  hotelName?: string
  roomNumber?: string
  instructions?: string
  otherInstructions?: string
  
  // Parking
  parking?: boolean
  hasPrivateParking?: boolean
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