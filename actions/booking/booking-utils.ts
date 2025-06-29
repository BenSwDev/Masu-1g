"use server"

import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"
import dbConnect from "@/lib/db/mongoose"
import Booking, { type IBooking } from "@/lib/db/models/booking"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
import User, { type IUser } from "@/lib/db/models/user"
import Address, { type IAddress, constructFullAddress as constructFullAddressHelper } from "@/lib/db/models/address"
import type { PopulatedBooking } from "@/types/booking"
import type { Booking as BookingCore, BookingAddress } from "@/types/core"

/**
 * Transform IBooking to PopulatedBooking for client use
 */
export async function toPopulatedBooking(booking: IBooking): Promise<PopulatedBooking> {
  try {
    const populatedBooking: PopulatedBooking = {
      _id: booking._id.toString(),
      userId: booking.userId,
      bookingNumber: booking.bookingNumber,
      
      // Basic booking info
      bookingDateTime: booking.bookingDateTime,
      isFlexibleTime: booking.isFlexibleTime,
      flexibilityRangeHours: booking.flexibilityRangeHours,
      therapistGenderPreference: booking.therapistGenderPreference,
      
      // Status and workflow
      status: booking.status,
      step: booking.step,
      
      // Address information
      addressId: booking.addressId,
      bookingAddressSnapshot: booking.bookingAddressSnapshot,
      
      // Professional information
      professionalId: booking.professionalId,
      suitableProfessionals: booking.suitableProfessionals,
      
      // Treatment information
      treatmentId: null, // Will be populated below
      selectedDurationId: booking.selectedDurationId,
      treatmentCategory: booking.treatmentCategory,
      
      // Pricing
      priceDetails: booking.priceDetails,
      staticTreatmentPrice: booking.staticTreatmentPrice,
      staticTherapistPay: booking.staticTherapistPay,
      staticTimeSurcharge: booking.staticTimeSurcharge,
      staticTimeSurchargeReason: booking.staticTimeSurchargeReason,
      staticTherapistPayExtra: booking.staticTherapistPayExtra,
      companyFee: booking.companyFee,
      
      // Payment information
      paymentDetails: booking.paymentDetails,
      enhancedPaymentDetails: booking.enhancedPaymentDetails,
      
      // Guest information
      guestInfo: booking.guestInfo,
      bookedByUserName: booking.bookedByUserName,
      bookedByUserEmail: booking.bookedByUserEmail,
      bookedByUserPhone: booking.bookedByUserPhone,
      recipientName: booking.recipientName,
      recipientPhone: booking.recipientPhone,
      recipientEmail: booking.recipientEmail,
      recipientBirthDate: booking.recipientBirthDate,
      recipientGender: booking.recipientGender,
      isBookingForSomeoneElse: booking.isBookingForSomeoneElse,
      
      // Gift information
      isGift: booking.isGift,
      giftGreeting: booking.giftGreeting,
      giftSendWhen: booking.giftSendWhen,
      giftHidePrice: booking.giftHidePrice,
      
      // Consents and preferences
      consents: booking.consents,
      notificationPreferences: booking.notificationPreferences,
      
      // Review
      review: booking.review,
      
      // Administrative
      notes: booking.notes,
      internalNotes: booking.internalNotes,
      cancellationReason: booking.cancellationReason,
      cancelledBy: booking.cancelledBy,
      
      // Timestamps
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    }

    // Populate treatment information
    if (booking.treatmentId) {
      try {
        const treatment = await Treatment.findById(booking.treatmentId)
          .select('name description category durations fixedPrice pricingType')
          .lean()
        
        if (treatment) {
          populatedBooking.treatmentId = {
            _id: treatment._id.toString(),
            name: treatment.name,
            description: treatment.description,
            category: treatment.category,
            durations: treatment.durations || [],
            fixedPrice: treatment.fixedPrice,
            pricingType: treatment.pricingType,
          }
        }
      } catch (error) {
        logger.warn("Failed to populate treatment for booking", { 
          bookingId: booking._id,
          treatmentId: booking.treatmentId,
          error 
        })
      }
    }

    // Populate professional information
    if (booking.professionalId) {
      try {
        const professional = await User.findById(booking.professionalId)
          .select('name email phone')
          .lean()
        
        if (professional) {
          populatedBooking.professionalId = {
            _id: professional._id.toString(),
            name: professional.name,
            email: professional.email,
            phone: professional.phone,
          }
        }
      } catch (error) {
        logger.warn("Failed to populate professional for booking", { 
          bookingId: booking._id,
          professionalId: booking.professionalId,
          error 
        })
      }
    }

    // Populate address information
    if (booking.addressId) {
      try {
        const address = await Address.findById(booking.addressId)
          .select('city street streetNumber fullAddress addressType apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes')
          .lean()
        
        if (address) {
          populatedBooking.addressId = {
            _id: address._id.toString(),
            city: address.city,
            street: address.street,
            streetNumber: address.streetNumber,
            fullAddress: address.fullAddress,
            addressType: address.addressType,
            apartmentDetails: address.apartmentDetails,
            houseDetails: address.houseDetails,
            officeDetails: address.officeDetails,
            hotelDetails: address.hotelDetails,
            otherDetails: address.otherDetails,
            additionalNotes: address.additionalNotes,
          }
        }
      } catch (error) {
        logger.warn("Failed to populate address for booking", { 
          bookingId: booking._id,
          addressId: booking.addressId,
          error 
        })
      }
    }

    return populatedBooking
  } catch (error) {
    logger.error("Error transforming booking to PopulatedBooking", { 
      bookingId: booking._id,
      error 
    })
    throw error
  }
}

/**
 * Construct booking address snapshot from address document
 */
export function constructBookingAddressSnapshot(address: IAddress): BookingAddress {
  const fullAddress = constructFullAddressHelper(address)
  
  return {
    fullAddress,
    city: address.city,
    street: address.street,
    streetNumber: address.streetNumber,
    apartment: address.addressType === "apartment" ? address.apartmentDetails?.apartmentNumber : undefined,
    entrance: address.addressType === "apartment" ? address.apartmentDetails?.entrance : undefined,
    floor: address.addressType === "apartment" ? address.apartmentDetails?.floor : undefined,
    notes: address.additionalNotes,
    doorName: address.addressType === "house" ? address.houseDetails?.doorName : undefined,
    buildingName: address.addressType === "office" ? address.officeDetails?.buildingName : undefined,
    hotelName: address.addressType === "hotel" ? address.hotelDetails?.hotelName : undefined,
    roomNumber: address.addressType === "hotel" ? address.hotelDetails?.roomNumber : undefined,
    otherInstructions: address.addressType === "other" ? address.otherDetails?.instructions : undefined,
    hasPrivateParking: address.hasPrivateParking || false,
  }
}

/**
 * Validate booking data before creation
 */
export async function validateBookingData(data: {
  treatmentId: string
  selectedDurationId?: string
  userId?: string
  addressId?: string
  bookingDateTime: Date
}): Promise<{ isValid: boolean; errors: string[] }> {
  const errors: string[] = []

  try {
    await dbConnect()

    // Validate treatment exists
    const treatment = await Treatment.findById(data.treatmentId).lean()
    if (!treatment) {
      errors.push("Treatment not found")
    } else {
      // Validate duration if provided
      if (data.selectedDurationId && treatment.pricingType === "duration_based") {
        const duration = treatment.durations?.find(
          (d: any) => d._id.toString() === data.selectedDurationId
        )
        if (!duration) {
          errors.push("Selected duration not found for treatment")
        }
      }
    }

    // Validate user exists if provided
    if (data.userId) {
      const user = await User.findById(data.userId).lean()
      if (!user) {
        errors.push("User not found")
      }
    }

    // Validate address exists if provided
    if (data.addressId) {
      const address = await Address.findById(data.addressId).lean()
      if (!address) {
        errors.push("Address not found")
      }
    }

    // Validate booking date is in the future
    const now = new Date()
    if (data.bookingDateTime <= now) {
      errors.push("Booking date must be in the future")
    }

    // Validate booking date is not too far in the future (e.g., 6 months)
    const sixMonthsFromNow = new Date()
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6)
    if (data.bookingDateTime > sixMonthsFromNow) {
      errors.push("Booking date cannot be more than 6 months in the future")
    }

    return { isValid: errors.length === 0, errors }
  } catch (error) {
    logger.error("Error validating booking data", { error, data })
    return { isValid: false, errors: ["Validation failed due to system error"] }
  }
}

/**
 * Check if booking can be cancelled
 */
export function canCancelBooking(booking: IBooking | PopulatedBooking): boolean {
  const cancelableStatuses = ["pending_payment", "in_process", "confirmed"]
  
  if (!cancelableStatuses.includes(booking.status)) {
    return false
  }

  // Check if booking is at least 2 hours in the future
  const bookingTime = new Date(booking.bookingDateTime)
  const now = new Date()
  const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  return hoursUntilBooking >= 2
}

/**
 * Check if booking can be rescheduled
 */
export function canRescheduleBooking(booking: IBooking | PopulatedBooking): boolean {
  const reschedulableStatuses = ["in_process", "confirmed"]
  
  if (!reschedulableStatuses.includes(booking.status)) {
    return false
  }

  // Check if booking is at least 12 hours in the future
  const bookingTime = new Date(booking.bookingDateTime)
  const now = new Date()
  const hoursUntilBooking = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60)
  
  return hoursUntilBooking >= 12
}

/**
 * Get booking display status in Hebrew
 */
export function getBookingDisplayStatus(status: string): string {
  const statusMap: Record<string, string> = {
    pending_payment: "ממתין לתשלום",
    in_process: "בעיבוד",
    confirmed: "מאושר",
    completed: "הושלם",
    cancelled: "בוטל",
    refunded: "הוחזר",
    no_show: "לא הגיע",
  }
  
  return statusMap[status] || status
}

/**
 * Calculate booking duration in minutes
 */
export function calculateBookingDuration(treatment: ITreatment, selectedDurationId?: string): number {
  if (treatment.pricingType === "fixed") {
    return treatment.defaultDuration || 60 // Default to 60 minutes
  }
  
  if (treatment.pricingType === "duration_based" && selectedDurationId) {
    const duration = treatment.durations?.find(
      (d: any) => d._id.toString() === selectedDurationId
    )
    return duration?.minutes || 60
  }
  
  return 60 // Default fallback
}

/**
 * Format booking date for display
 */
export function formatBookingDate(date: Date | string, includeTime: boolean = true): string {
  const d = new Date(date)
  
  if (isNaN(d.getTime())) {
    return "תאריך לא תקין"
  }
  
  const dateStr = d.toLocaleDateString('he-IL', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  if (!includeTime) {
    return dateStr
  }
  
  const timeStr = d.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit'
  })
  
  return `${dateStr} ${timeStr}`
} 