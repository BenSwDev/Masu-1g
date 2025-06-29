import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { dbConnect } from "@/lib/db/mongodb"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"

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
export async function sendUnifiedProfessionalNotifications(
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
      .populate('treatmentId', 'name')
      .populate('selectedDurationId')
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (!["confirmed", "in_process"].includes(booking.status)) {
      return { success: false, error: "Booking is not in correct status for notifications" }
    }

    if (booking.professionalId) {
      return { success: false, error: "Booking already has a professional assigned" }
    }

    // Prepare notification data
    const treatmentName = (booking.treatmentId as any)?.name || "טיפול"
    const bookingDateTime = booking.bookingDateTime
    const address = `${booking.bookingAddressSnapshot?.street || ""} ${booking.bookingAddressSnapshot?.streetNumber || ""}, ${booking.bookingAddressSnapshot?.city || ""}`
    const price = booking.priceDetails?.finalAmount || 0

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
      const suitableResult = await findSuitableProfessionals(options.bookingId)
      
      if (!suitableResult.success || !suitableResult.professionals) {
        return { success: false, error: "No suitable professionals found" }
      }

      // Convert suitable professionals to notification format
      professionalsToNotify = suitableResult.professionals.map(prof => ({
        professionalId: prof.userId._id.toString(),
        email: !!prof.userId.email,
        sms: !!prof.userId.phone
      }))

      logger.info("Sending notifications to all suitable professionals", {
        bookingId: options.bookingId,
        count: professionalsToNotify.length
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
          status: "pending",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        })

        await response.save()

        // Prepare notification
        const responseLink = `${process.env.NEXT_PUBLIC_APP_URL}/professional/booking-response/${response._id.toString()}`
        const userLanguage = professional.preferredLanguage || "he"

        const notificationData = {
          type: "professional-booking-notification" as const,
          treatmentName,
          bookingDateTime,
          address,
          price,
          responseLink,
          responseId: response._id.toString()
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
  if (!booking || !["confirmed", "in_process"].includes(booking.status) || booking.professionalId) {
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
