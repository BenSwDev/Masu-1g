import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import { smsService } from "@/lib/notifications/sms-service"
import mongoose from "mongoose"

// Static imports for all models
import VerificationToken from "@/lib/db/models/verification-token"
import User from "@/lib/db/models/user"
import Booking from "@/lib/db/models/booking"
import ProfessionalResponse from "@/lib/db/models/professional-response"

/**
 * General Notification Service
 * 
 * This file contains notification functions that are NOT related to professional booking notifications.
 * Professional booking notifications are now handled by the unified-professional-notifications system.
 */

// =====================================
// OTP FUNCTIONS
// =====================================

/**
 * Send OTP to user's phone
 */
export async function sendOTP(
  phone: string,
  language: "he" | "en" | "ru" = "he"
): Promise<{ success: boolean; error?: string; messageId?: string; obscuredIdentifier?: string }> {
  try {
    await dbConnect()

    // Check if user exists with this phone
    const user = await User.findOne({ phone }).lean()
    if (!user) {
      // For security, don't reveal if phone exists or not
      return { 
        success: true, // Return success to not reveal phone existence
        messageId: "security_dummy",
        obscuredIdentifier: phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
      }
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Store OTP in database
    await VerificationToken.deleteMany({ 
      identifier: phone, 
      identifierType: "phone" 
    })

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    await (VerificationToken as any).create({
      identifier: phone,
      identifierType: "phone",
      code: otp,
      expiresAt,
      attempts: 0
    })
    
    // Send SMS using notification manager
    const notificationResult = await unifiedNotificationService.sendNotification(
      {
        type: "phone",
        value: phone,
        language
      },
      {
        type: "otp",
        code: otp,
        expiresIn: 10
      }
    )

    if (notificationResult.success) {
      return { 
        success: true, 
        messageId: notificationResult.messageId,
        obscuredIdentifier: phone.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')
      }
    } else {
      return { 
        success: false, 
        error: notificationResult.error || "Failed to send OTP" 
      }
    }

  } catch (error) {
    logger.error("Error sending OTP:", error)
    return { 
      success: false, 
      error: "Failed to send OTP" 
    }
  }
}

/**
 * Verify OTP
 */
export async function verifyOTP(
  phone: string,
  otp: string
): Promise<{ success: boolean; error?: string; userId?: string; message?: string }> {
  try {
    await dbConnect()
    
    // Check if user exists with this phone
    const user = await User.findOne({ phone }).lean()
    if (!user) {
      return { 
        success: false, 
        error: "PHONE_NOT_FOUND",
        message: "מספר טלפון לא נמצא במערכת" 
      }
    }

    // Find valid OTP token
    const now = new Date()
    const otpToken = await (VerificationToken as any).findOne({
      identifier: phone,
      identifierType: "phone",
      code: otp,
      expiresAt: { $gt: now }
    })

    if (!otpToken) {
      return { 
        success: false, 
        error: "INVALID_OTP",
        message: "קוד OTP לא תקף או פג תוקף" 
      }
    }

    // Check attempts limit
    if (otpToken.attempts >= 3) {
      // Delete the token to prevent further attempts
      await VerificationToken.deleteOne({ _id: otpToken._id })
      return { 
        success: false, 
        error: "TOO_MANY_ATTEMPTS",
        message: "יותר מדי ניסיונות. אנא בקש קוד חדש" 
      }
    }

    // Increment attempts
    await (VerificationToken as any).updateOne(
      { _id: otpToken._id },
      { $inc: { attempts: 1 } }
    )

    // Delete the used token
    await VerificationToken.deleteOne({ _id: otpToken._id })

    return { 
      success: true, 
      userId: user._id.toString(),
      message: "OTP verified successfully" 
    }

  } catch (error) {
    logger.error("Error verifying OTP:", error)
    return { 
      success: false, 
      error: "VERIFICATION_ERROR",
      message: "שגיאה באימות הקוד" 
    }
  }
}

// =====================================
// USER NOTIFICATION PREFERENCES
// =====================================

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<{ success: boolean; preferences?: any; error?: string }> {
  try {
    await dbConnect()
    
    const user = await User.findById(userId).select("notificationPreferences").lean()
    
    if (!user) {
      return { success: false, error: "User not found" }
    }

    return { 
      success: true, 
      preferences: user.notificationPreferences || {
        methods: ["sms"],
        language: "he"
      }
    }

  } catch (error) {
    logger.error("Error getting user notification preferences:", error)
    return { success: false, error: "Failed to get preferences" }
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: {
    methods?: string[]
    language?: string
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()
    
    await (User as any).findByIdAndUpdate(
      userId,
      { 
        $set: { 
          notificationPreferences: preferences 
        }
      }
    )

    return { success: true }

  } catch (error) {
    logger.error("Error updating user notification preferences:", error)
    return { success: false, error: "Failed to update preferences" }
  }
}

// =====================================
// BOOKING CONFIRMATION NOTIFICATIONS
// =====================================

/**
 * Send booking confirmation to user
 */
export async function sendBookingConfirmationToUser(
  userId: string,
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()
    
    const [user, booking] = await Promise.all([
      (User as any).findById(userId).select("name email phone notificationPreferences").lean(),
      (Booking as any).findById(bookingId)
        .populate('treatmentId', 'name')
        .lean()
    ])

    if (!user || !booking) {
      return { success: false, error: "User or booking not found" }
    }

    const userLanguage = user.notificationPreferences?.language || "he"
    const notificationMethods = user.notificationPreferences?.methods || ["sms"]

    const notificationData = {
      type: "treatment-booking-success" as const,
      treatmentName: (booking.treatmentId as any)?.name || "טיפול",
      bookingDateTime: booking.bookingDateTime,
      bookingNumber: booking.bookingNumber,
      recipientName: user.name,
      userName: user.name,
      bookingDetailsLink: `${process.env.NEXT_PUBLIC_APP_URL}/booking-details/${booking.bookingNumber}`,
      bookingAddress: booking.bookingAddressSnapshot?.fullAddress || "כתובת לא זמינה",
      isForSomeoneElse: false,
      // ➕ הוספת פרטי תשלום מפורטים
      priceDetails: {
        basePrice: booking.priceDetails?.basePrice || 0,
        surcharges: booking.priceDetails?.surcharges || [],
        totalSurchargesAmount: booking.priceDetails?.totalSurchargesAmount || 0,
        discountAmount: booking.priceDetails?.discountAmount || 0,
        voucherAppliedAmount: booking.priceDetails?.voucherAppliedAmount || 0,
        couponDiscount: booking.priceDetails?.discountAmount || 0,
        finalAmount: booking.priceDetails?.finalAmount || 0,
        isFullyCoveredByVoucherOrSubscription: booking.priceDetails?.isFullyCoveredByVoucherOrSubscription || false,
        appliedCouponCode: undefined, // ObjectId - נדרש populate נפרד
        appliedGiftVoucherCode: undefined, // ObjectId - נדרש populate נפרד  
        redeemedSubscriptionName: undefined, // ObjectId - נדרש populate נפרד
      },
      paymentDetails: {
        paymentStatus: booking.paymentDetails?.paymentStatus || "pending",
        transactionId: booking.paymentDetails?.transactionId,
        paymentMethod: booking.paymentDetails?.transactionId ? "כרטיס אשראי" : undefined,
        cardLast4: booking.enhancedPaymentDetails?.cardLast4,
      },
      bookingSource: booking.source || "new_purchase",
    }

    const recipients = []
    
    if (notificationMethods.includes("email") && user.email) {
      recipients.push({ 
        type: "email" as const, 
        value: user.email, 
        name: user.name, 
        language: userLanguage as "he" | "en" | "ru"
      })
    }
    
    if (notificationMethods.includes("sms") && user.phone) {
      recipients.push({ 
        type: "phone" as const, 
        value: user.phone, 
        language: userLanguage as "he" | "en" | "ru"
      })
    }

    if (recipients.length > 0) {
      await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData as any)
    }

    return { success: true }

  } catch (error) {
    logger.error("Error sending booking confirmation:", error)
    return { success: false, error: "Failed to send confirmation" }
  }
}

/**
 * Send notification to user (registered user)
 */
export async function sendUserNotification(
  userId: string,
  notificationData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    await dbConnect()
    
    const user = await (User as any).findById(userId).select("name email phone notificationPreferences").lean()
    
    if (!user) {
      return { success: false, error: "User not found" }
    }

    const userLanguage = user.notificationPreferences?.language || "he"
    const notificationMethods = user.notificationPreferences?.methods || ["sms"]

    const recipients = []
    
    if (notificationMethods.includes("email") && user.email) {
      recipients.push({ 
        type: "email" as const, 
        value: user.email, 
        name: user.name, 
        language: userLanguage as "he" | "en" | "ru"
      })
    }
    
    if (notificationMethods.includes("sms") && user.phone) {
      recipients.push({ 
        type: "phone" as const, 
        value: user.phone, 
        language: userLanguage as "he" | "en" | "ru"
      })
    }

    if (recipients.length > 0) {
      await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData)
    }

    return { success: true }

  } catch (error) {
    logger.error("Error sending user notification:", error)
    return { success: false, error: "Failed to send notification" }
  }
}

/**
 * Send notification to guest (non-registered user)
 */
export async function sendGuestNotification(
  guestInfo: {
    name: string
    email?: string
    phone?: string
    language?: string
  },
  notificationData: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const language = (guestInfo.language || "he") as "he" | "en" | "ru"
    const recipients = []
    
    if (guestInfo.email) {
      recipients.push({ 
        type: "email" as const, 
        value: guestInfo.email, 
        name: guestInfo.name, 
        language
      })
    }
    
    if (guestInfo.phone) {
      recipients.push({ 
        type: "phone" as const, 
        value: guestInfo.phone, 
        language
      })
    }

    if (recipients.length > 0) {
      await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData)
    }

    return { success: true }

  } catch (error) {
    logger.error("Error sending guest notification:", error)
    return { success: false, error: "Failed to send notification" }
  }
}

// =====================================
// PROFESSIONAL RESPONSE FUNCTIONS
// =====================================

/**
 * Get professional responses for a booking
 */
export async function getProfessionalResponses(
  bookingId: string
): Promise<{ success: boolean; responses?: any[]; error?: string }> {
  try {
    await dbConnect()
    
    const responses = await (ProfessionalResponse as any).find({ bookingId })
      .populate('professionalId', 'name phone email')
      .sort({ createdAt: -1 })
      .lean()

    return { success: true, responses }

  } catch (error) {
    logger.error("Error getting professional responses:", error)
    return { success: false, error: "Failed to get responses" }
  }
}

/**
 * Handle professional response to booking notification
 */
async function handleProfessionalResponse(
  responseId: string,
  action: "accept" | "decline",
  responseMethod: "sms" | "app" | "phone" = "sms"
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()
    
    // Find response
    const response = await (ProfessionalResponse as any).findById(responseId)
      .populate('professionalId', 'name phone')
      .populate('bookingId')
    
    if (!response) {
      return { success: false, error: "Response not found" }
    }
    
    // Validate response
    if (response.status !== "pending") {
      return { success: false, error: "Response already processed" }
    }
    
    // Check booking availability
    const booking = response.bookingId
    if (!booking || booking.status !== "pending_professional" || booking.professionalId) {
      return { success: false, error: "Booking is no longer available" }
    }
    
    if (action === "accept") {
      // Professional accepts the booking
      response.status = "accepted"
      response.responseMethod = responseMethod
      response.respondedAt = new Date()
      await response.save()
      
      // Assign professional to booking
      const { assignProfessionalToBooking } = await import("@/actions/booking-actions")
      const assignResult = await assignProfessionalToBooking(
        booking._id.toString(), 
        response.professionalId._id.toString()
      )
      
      if (assignResult.success) {
        // Expire all other pending responses for this booking
        await ProfessionalResponse.updateMany(
          {
            bookingId: booking._id,
            _id: { $ne: response._id },
            status: "pending"
          },
          { status: "expired" }
        )
        
        return { 
          success: true, 
          message: "Booking accepted successfully" 
        }
      } else {
        response.status = "failed"
        await response.save()
        return { 
          success: false, 
          error: "Failed to assign booking" 
        }
      }
    } else {
      // Professional declines the booking
      response.status = "declined"
      response.responseMethod = responseMethod
      response.respondedAt = new Date()
      await response.save()
      
      return { 
        success: true, 
        message: "Booking declined" 
      }
    }
    
  } catch (error) {
    logger.error("Error handling professional response:", error)
    return { success: false, error: "Failed to process response" }
  }
}

/**
 * Resend notifications to professionals (admin only)
 */
export async function resendProfessionalNotifications(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user || !session.user.roles.includes("admin")) {
    return { success: false, error: "Unauthorized" }
  }
  
  try {
    // Use the unified notification system for resending
    const { resendProfessionalNotifications } = await import("@/actions/unified-professional-notifications")
    return await resendProfessionalNotifications(bookingId)
    
  } catch (error) {
    logger.error("Error resending professional notifications:", error)
    return { success: false, error: "Failed to resend notifications" }
  }
} 