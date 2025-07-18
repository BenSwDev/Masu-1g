import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import { calculateTreatmentDuration } from "@/lib/utils/treatment-duration-utils"

/**
 * Unified Professional Notification System
 * 
 * This system handles all professional notifications in a consistent way:
 * 1. Automatic notifications when new bookings are created
 * 2. Manual notifications from admin interface
 * 3. Resend notifications functionality
 */

interface ProfessionalNotificationOptions {
  bookingId: string
  selectedProfessionals?: Array<{
    professionalId: string
    email: boolean
    sms: boolean
  }>
  sendToAllSuitable?: boolean
  adminId?: string
}

/**
 * Send notifications to professionals for a booking
 * This is the main unified function that handles all notification scenarios
 */
async function sendUnifiedProfessionalNotifications(
  options: ProfessionalNotificationOptions
): Promise<{ success: boolean; sentCount?: number; error?: string; results?: any[] }> {
  try {
    await dbConnect()

    // Import models
    const Booking = (await import("@/lib/db/models/booking")).default
    const User = (await import("@/lib/db/models/user")).default
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default

    // Get booking details
    const booking = await Booking.findById(options.bookingId)
      .populate('treatmentId', 'name durations pricingType')
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (!["confirmed", "pending_professional"].includes(booking.status)) {
      return { success: false, error: "Booking is not in correct status for notifications" }
    }

    if (booking.professionalId) {
      return { success: false, error: "Booking already has a professional assigned" }
    }

    // Prepare notification data
    const treatment = booking.treatmentId as any
    const treatmentName = treatment?.name || "טיפול"
    const bookingDateTime = booking.bookingDateTime
    const address = `${booking.bookingAddressSnapshot?.street || ""} ${booking.bookingAddressSnapshot?.streetNumber || ""}, ${booking.bookingAddressSnapshot?.city || ""}`
    const price = booking.priceDetails?.finalAmount || 0
    
    // Calculate treatment duration using utility function
    const treatmentDurationText = calculateTreatmentDuration(booking as any)
    const treatmentDuration = treatmentDurationText

    let professionalsToNotify: Array<{
      professionalId: string
      email: boolean
      sms: boolean
    }> = []

    // Determine which professionals to notify
    if (options.selectedProfessionals && options.selectedProfessionals.length > 0) {
      // Manual selection from admin interface
      professionalsToNotify = options.selectedProfessionals
      logger.info("Sending notifications to manually selected professionals", {
        bookingId: options.bookingId,
        count: professionalsToNotify.length,
        adminId: options.adminId
      })
    } else if (options.sendToAllSuitable) {
      // Automatic notifications to all suitable professionals
      const { findSuitableProfessionals } = await import("@/actions/booking-actions")
      
      logger.info("Starting to find suitable professionals for booking", {
        bookingId: options.bookingId
      })
      
      const suitableResult = await findSuitableProfessionals(options.bookingId)
      
      logger.info("Result from findSuitableProfessionals", {
        bookingId: options.bookingId,
        success: suitableResult.success,
        professionalsCount: suitableResult.professionals?.length || 0,
        error: suitableResult.error
      })
      
      if (!suitableResult.success || !suitableResult.professionals) {
        logger.error("No suitable professionals found for booking", {
          bookingId: options.bookingId,
          error: suitableResult.error
        })
        return { success: false, error: suitableResult.error || "No suitable professionals found" }
      }

      // Convert suitable professionals to notification format - CHECK USER PREFERENCES
      professionalsToNotify = suitableResult.professionals.map(prof => {
        // Get notification preferences from user (professional)
        const userNotificationMethods = prof.userId?.notificationPreferences?.methods || ["sms"]
        
        const result = {
          professionalId: prof._id.toString(),
          email: !!prof.email && userNotificationMethods.includes("email"),
          sms: !!prof.phone && userNotificationMethods.includes("sms")
        }
        
        logger.info("Professional notification preferences", {
          professionalId: prof._id.toString(),
          professionalName: prof.userId?.name,
          hasEmail: !!prof.email,
          hasPhone: !!prof.phone,
          userPreferences: userNotificationMethods,
          willSendEmail: result.email,
          willSendSms: result.sms
        })
        
        return result
      })

      logger.info("Sending notifications to all suitable professionals", {
        bookingId: options.bookingId,
        count: professionalsToNotify.length,
        professionals: professionalsToNotify.map(p => ({ id: p.professionalId, hasEmail: p.email, hasSms: p.sms }))
      })
    } else {
      return { success: false, error: "No professionals specified for notification" }
    }

    // Import notification services
    const { unifiedNotificationService } = await import("@/lib/notifications/unified-notification-service")
    const { smsService } = await import("@/lib/notifications/sms-service")

    let sentCount = 0
    const results = []

    // Process each professional
    for (const profData of professionalsToNotify) {
      const { professionalId, email: sendEmail, sms: sendSms } = profData

      if (!mongoose.Types.ObjectId.isValid(professionalId)) {
        results.push({
          professionalId,
          success: false,
          error: "Invalid professional ID"
        })
        continue
      }

      try {
        // Get professional details
        const professional = await User.findById(professionalId)
          .select("name email phone preferredLanguage notificationPreferences")
          .lean()

        if (!professional) {
          results.push({
            professionalId,
            success: false,
            error: "Professional not found"
          })
          continue
        }

        // Expire any existing pending responses for this professional
        await ProfessionalResponse.updateMany(
          {
            bookingId: new mongoose.Types.ObjectId(options.bookingId),
            professionalId: new mongoose.Types.ObjectId(professionalId),
            status: "pending"
          },
          { status: "expired" }
        )

        // Create new response record for tracking
        const response = new ProfessionalResponse({
          bookingId: new mongoose.Types.ObjectId(options.bookingId),
          professionalId: new mongoose.Types.ObjectId(professionalId),
          phoneNumber: professional.phone,
          status: "pending"
        })

        await response.save()

        // Prepare notification
        const responseLink = `${process.env.NEXT_PUBLIC_APP_URL}/professional/booking-response/${response._id.toString()}`
        const userLanguage = "he"

        const notificationData = {
          type: "professional-booking-notification" as const,
          treatmentName,
          treatmentDuration, // ✅ Add duration for SMS template
          bookingDateTime,
          address,
          price,
          responseLink,
          responseId: response._id.toString(),
          responseMethod: response.responseMethod // ✅ Pass responseMethod to templates for correct message detection
        }

        let emailSent = false
        let smsSent = false

        // Send email if requested and available
        if (sendEmail && professional.email) {
          try {
            const emailResult = await unifiedNotificationService.sendNotification(
              {
                type: "email",
                value: professional.email,
                name: professional.name,
                language: userLanguage as any
              },
              notificationData
            )
            emailSent = emailResult.success
          } catch (error) {
            logger.error(`Failed to send email to professional ${professional.name}:`, error)
          }
        }

        // Send SMS if requested and available
        if (sendSms && professional.phone) {
          try {
            const smsResult = await smsService.sendNotification(
              {
                type: "phone",
                value: professional.phone,
                language: userLanguage as "he" | "en" | "ru"
              },
              notificationData
            )

            if (smsResult.success) {
              smsSent = true
              response.smsMessageId = smsResult.messageId
              await response.save()
            }
          } catch (error) {
            logger.error(`Failed to send SMS to professional ${professional.name}:`, error)
          }
        }

        // Update response status based on results
        if (emailSent || smsSent) {
          sentCount++
          results.push({
            professionalId,
            professionalName: professional.name,
            success: true,
            emailSent,
            smsSent
          })
        } else {
          response.status = "expired"
          await response.save()
          results.push({
            professionalId,
            professionalName: professional.name,
            success: false,
            error: "No notifications sent - check contact information"
          })
        }

      } catch (error) {
        logger.error(`Error processing professional ${professionalId}:`, error)
        results.push({
          professionalId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    logger.info("Unified notification sending completed", {
      bookingId: options.bookingId,
      totalProfessionals: professionalsToNotify.length,
      sentCount,
      results
    })

    return {
      success: true,
      sentCount,
      results,
    }

  } catch (error) {
    logger.error("Error in unified professional notifications:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Internal server error" 
    }
  }
}

/**
 * Send automatic notifications to all suitable professionals when a booking is created
 */
export async function sendAutomaticProfessionalNotifications(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  return await sendUnifiedProfessionalNotifications({
    bookingId,
    sendToAllSuitable: true
  })
}

/**
 * Send manual notifications to selected professionals (admin only)
 */
export async function sendManualProfessionalNotifications(
  bookingId: string,
  selectedProfessionals: Array<{
    professionalId: string
    email: boolean
    sms: boolean
  }>
): Promise<{ success: boolean; sentCount?: number; error?: string; results?: any[] }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "Unauthorized" }
  }

  return await sendUnifiedProfessionalNotifications({
    bookingId,
    selectedProfessionals,
    adminId: session.user.id
  })
}

/**
 * Send payment bonus notifications to suitable professionals
 * This creates attractive notifications that encourage professionals to take the booking
 */
export async function sendPaymentBonusNotifications(
  bookingId: string,
  bonusAmount: number,
  bonusDescription: string
): Promise<{ success: boolean; sentCount?: number; error?: string; results?: any[] }> {
  try {
    await dbConnect()

    // Import models
    const Booking = (await import("@/lib/db/models/booking")).default
    const User = (await import("@/lib/db/models/user")).default
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('treatmentId', 'name durations pricingType')
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (booking.status !== "pending_professional" || booking.professionalId) {
      return { success: false, error: "Booking is not available for professional assignment" }
    }

    // Get suitable professionals for this booking
    const { getSuitableProfessionalsForBooking } = await import("@/actions/booking-actions")
    const suitableProfessionals = await getSuitableProfessionalsForBooking(bookingId)

    if (!suitableProfessionals.success || !suitableProfessionals.professionals?.length) {
      return { success: false, error: "No suitable professionals found" }
    }

    // Prepare attractive notification data
    const treatmentName = (booking.treatmentId as any)?.name || "טיפול"
    const bookingDateTime = booking.bookingDateTime
    const address = `${booking.bookingAddressSnapshot?.city || ""}${booking.bookingAddressSnapshot?.street ? `, ${booking.bookingAddressSnapshot.street}` : ""}`
    const basePayment = booking.priceDetails?.baseProfessionalPayment || 0
    const surcharges = booking.priceDetails?.surchargesProfessionalPayment || 0
    const totalWithBonus = basePayment + surcharges + bonusAmount

    const results: any[] = []
    let sentCount = 0

    // Send notifications to each suitable professional
    for (const prof of suitableProfessionals.professionals) {
      const professionalId = prof._id.toString()
      
      try {
        // Get professional details
        const professional = await User.findById(professionalId)
          .select("name email phone preferredLanguage notificationPreferences")
          .lean()

        if (!professional) {
          results.push({
            professionalId,
            success: false,
            error: "Professional not found"
          })
          continue
        }

        // Expire any existing pending responses for this professional
        await (ProfessionalResponse.updateMany as any)(
          {
            bookingId: new mongoose.Types.ObjectId(bookingId),
            professionalId: new mongoose.Types.ObjectId(professionalId),
            status: "pending"
          },
          { status: "expired" }
        )

        // Try to find existing response first
        let response = await (ProfessionalResponse.findOne as any)({
          bookingId: new mongoose.Types.ObjectId(bookingId),
          professionalId: new mongoose.Types.ObjectId(professionalId)
        })

        if (response) {
          // Update existing response
          response.status = "pending"
          response.phoneNumber = professional.phone
          response.createdAt = new Date()
          await response.save()
        } else {
          // Create new response record for tracking
          response = new ProfessionalResponse({
            bookingId: new mongoose.Types.ObjectId(bookingId),
            professionalId: new mongoose.Types.ObjectId(professionalId),
            phoneNumber: professional.phone,
            status: "pending"
          })

          try {
            await response.save()
          } catch (duplicateError: any) {
            if (duplicateError.code === 11000) {
              // Handle duplicate key error - find and update existing
              response = await (ProfessionalResponse.findOneAndUpdate as any)(
                {
                  bookingId: new mongoose.Types.ObjectId(bookingId),
                  professionalId: new mongoose.Types.ObjectId(professionalId)
                },
                {
                  status: "pending",
                  phoneNumber: professional.phone,
                  createdAt: new Date()
                },
                { new: true }
              )
              if (!response) {
                throw duplicateError
              }
            } else {
              throw duplicateError
            }
          }
        }

        // Prepare attractive notification with smart messaging
        const responseLink = `${process.env.NEXT_PUBLIC_APP_URL}/professional/booking-response/${response._id.toString()}`
        const userLanguage = "he"

        const notificationData = {
          type: "professional-payment-bonus-notification" as const,
          treatmentName,
          bookingDateTime,
          address,
          basePayment,
          bonusAmount,
          totalPayment: totalWithBonus,
          bonusDescription,
          responseLink,
          responseId: response._id.toString()
        }

        // Send via unified notification service
        const { unifiedNotificationService } = await import("@/lib/notifications/unified-notification-service")
        
        const recipients = []
        
        // Add email recipient if available
        if (professional.email) {
          recipients.push({
            type: "email" as const,
            value: professional.email,
            name: professional.name,
            language: userLanguage
          })
        }
        
        // Add SMS recipient
        if (professional.phone) {
          recipients.push({
            type: "phone" as const,
            value: professional.phone,
            language: userLanguage
          })
        }

        if (recipients.length > 0) {
          await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData)
          sentCount++
          
          results.push({
            professionalId,
            success: true,
            sentVia: recipients.map(r => r.type)
          })
        } else {
          results.push({
            professionalId,
            success: false,
            error: "No contact information available"
          })
        }

      } catch (error) {
        logger.error("Error sending payment bonus notification to professional", {
          error,
          professionalId,
          bookingId
        })
        
        results.push({
          professionalId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        })
      }
    }

    logger.info("Payment bonus notifications sent", {
      bookingId,
      bonusAmount,
      totalProfessionals: suitableProfessionals.professionals.length,
      sentCount,
      successRate: (sentCount / suitableProfessionals.professionals.length) * 100
    })

    return {
      success: true,
      sentCount,
      results
    }

  } catch (error) {
    logger.error("Error in sendPaymentBonusNotifications:", error)
    return { success: false, error: "Failed to send payment bonus notifications" }
  }
}

/**
 * Resend notifications to professionals (admin only)
 */
export async function resendProfessionalNotifications(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "Unauthorized" }
  }

  await dbConnect()

  const Booking = (await import("@/lib/db/models/booking")).default
  const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default

  // Check booking status
  const booking = await Booking.findById(bookingId)
  if (!booking || !["confirmed", "pending_professional"].includes(booking.status) || booking.professionalId) {
    return { success: false, error: "Booking is not available for assignment" }
  }

  // Expire all pending responses
  await ProfessionalResponse.updateMany(
    {
      bookingId: new mongoose.Types.ObjectId(bookingId),
      status: "pending"
    },
    { status: "expired" }
  )

  // Send new notifications to all suitable professionals
  return await sendUnifiedProfessionalNotifications({
    bookingId,
    sendToAllSuitable: true,
    adminId: session.user.id
  })
} 