"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking, { type IBooking } from "@/lib/db/models/booking"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"
import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"
import { revalidatePath } from "next/cache"
import { unifiedNotificationService } from "@/lib/notifications/unified-service"
import type {
  NotificationLanguage,
  ProfessionalBookingNotificationData,
} from "@/lib/notifications/notification-types"

/**
 * Professional accepts a booking assignment
 */
export async function professionalAcceptBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    return { success: false, error: "common.unauthorized" }
  }
  const professionalId = session.user.id

  const mongooseDbSession = await mongoose.startSession()
  try {
    await dbConnect()
    let acceptedBooking: any = null

    await mongooseDbSession.withTransaction(async () => {
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) {
        throw new Error("bookings.errors.bookingNotFound")
      }
      if (booking.status !== "in_process" || booking.professionalId) {
        throw new Error("bookings.errors.bookingNotAvailableForProfessionalAssignment")
      }

      booking.professionalId = new mongoose.Types.ObjectId(professionalId)
      await booking.save({ session: mongooseDbSession })
      acceptedBooking = booking.toObject()
    })

    if (acceptedBooking) {
      revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
      revalidatePath("/dashboard/admin/bookings")

      // Send notification to client
      try {
        const clientUser = await User.findById(acceptedBooking.userId)
          .select("name email phone notificationPreferences")
          .lean()
        const treatment = await Treatment.findById(acceptedBooking.treatmentId)
          .select("name")
          .lean()
        const professional = await User.findById(professionalId).select("name").lean()

        if (clientUser && treatment && professional) {
          const clientLang =
            (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
          const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["sms"]

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ""
          const notificationData: ProfessionalBookingNotificationData = {
            type: "BOOKING_ASSIGNED_PROFESSIONAL",
            treatmentName: treatment.name,
            bookingDateTime: acceptedBooking.bookingDateTime,
            professionalName: professional.name || "מטפל/ת",
            clientName: clientUser.name || "לקוח/ה",
            userName: clientUser.name || "לקוח/ה",
            bookingDetailsLink: `${baseUrl}/dashboard/member/bookings?bookingId=${acceptedBooking._id.toString()}`,
          }

          const recipients = []
          if (clientNotificationMethods.includes("email") && clientUser.email) {
            recipients.push({
              type: "email" as const,
              value: clientUser.email,
              name: clientUser.name,
              language: clientLang,
            })
          }
          if (clientNotificationMethods.includes("sms") && clientUser.phone) {
            recipients.push({
              type: "phone" as const,
              value: clientUser.phone,
              language: clientLang,
            })
          }

          if (recipients.length > 0) {
            await unifiedNotificationService.sendNotificationToMultiple(
              recipients,
              notificationData
            )
          }
        }
      } catch (notificationError) {
        logger.error("Failed to send booking professional assigned notification to client:", {
          error: notificationError,
          bookingId,
        })
      }
      return { success: true, booking: acceptedBooking }
    }
    return { success: false, error: "bookings.errors.assignProfessionalFailed" }
  } catch (error) {
    logger.error("Error in professionalAcceptBooking (assign professional):", {
      error,
      bookingId,
      professionalId,
    })
    const errorMessage =
      error instanceof Error ? error.message : "bookings.errors.assignProfessionalFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.")
        ? errorMessage
        : "bookings.errors.assignProfessionalFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

/**
 * Professional marks booking as en route
 */
export async function professionalMarkEnRoute(
  bookingId: string
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    return { success: false, error: "common.unauthorized" }
  }
  const professionalId = session.user.id

  try {
    await dbConnect()
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }
    if (booking.professionalId?.toString() !== professionalId) {
      return { success: false, error: "common.forbidden" }
    }
    if (booking.status !== "confirmed") {
      return { success: false, error: "bookings.errors.bookingNotInCorrectStateForEnRoute" }
    }

    booking.status = "confirmed" // Keep as confirmed when en route

    // Ensure required fields have valid values for backward compatibility
    if (!booking.treatmentCategory) {
      booking.treatmentCategory = new mongoose.Types.ObjectId()
    }
    if (typeof booking.staticTreatmentPrice !== "number") {
      booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
    }
    if (typeof booking.staticTherapistPay !== "number") {
      booking.staticTherapistPay = 0
    }
    if (typeof booking.companyFee !== "number") {
      booking.companyFee = 0
    }
    if (!booking.consents) {
      booking.consents = {
        customerAlerts: "email",
        patientAlerts: "email",
        marketingOptIn: false,
        termsAccepted: false,
      }
    }

    await booking.save()
    revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)

    return { success: true, booking: booking.toObject() }
  } catch (error) {
    logger.error("Error in professionalMarkEnRoute:", { error, bookingId, professionalId })
    return { success: false, error: "bookings.errors.markEnRouteFailed" }
  }
}

/**
 * Professional marks booking as completed
 */
export async function professionalMarkCompleted(
  bookingId: string
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    return { success: false, error: "common.unauthorized" }
  }
  const professionalId = session.user.id

  try {
    await dbConnect()
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }
    if (booking.professionalId?.toString() !== professionalId) {
      return { success: false, error: "common.forbidden" }
    }
    if (!["confirmed", "in_process"].includes(booking.status)) {
      return { success: false, error: "bookings.errors.bookingNotInCorrectStateForCompletion" }
    }

    booking.status = "completed"

    // Ensure required fields have valid values for backward compatibility
    if (!booking.treatmentCategory) {
      booking.treatmentCategory = new mongoose.Types.ObjectId()
    }
    if (typeof booking.staticTreatmentPrice !== "number") {
      booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
    }
    if (typeof booking.staticTherapistPay !== "number") {
      booking.staticTherapistPay = 0
    }
    if (typeof booking.companyFee !== "number") {
      booking.companyFee = 0
    }
    if (!booking.consents) {
      booking.consents = {
        customerAlerts: "email",
        patientAlerts: "email",
        marketingOptIn: false,
        termsAccepted: false,
      }
    }

    await booking.save()
    revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)
    revalidatePath("/dashboard/admin/bookings")

    // Send review reminder
    try {
      const { sendReviewReminder } = await import("@/actions/review-actions")
      await sendReviewReminder(bookingId)
    } catch (notifyError) {
      logger.error("Failed to send review reminder:", notifyError)
    }

    return { success: true, booking: booking.toObject() }
  } catch (error) {
    logger.error("Error in professionalMarkCompleted:", { error, bookingId, professionalId })
    return { success: false, error: "bookings.errors.markCompletedFailed" }
  }
}

/**
 * Admin assigns professional to booking
 */
export async function assignProfessionalToBooking(
  bookingId: string,
  professionalId: string
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  const mongooseDbSession = await mongoose.startSession()
  let assignedBooking: any = null

  try {
    await mongooseDbSession.withTransaction(async () => {
      await dbConnect()

      // Verify professional exists and has professional role
      const professional = await User.findById(professionalId).session(mongooseDbSession)
      if (!professional || !professional.roles.includes("professional")) {
        throw new Error("bookings.errors.professionalNotFound")
      }

      // Find and update booking
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) {
        throw new Error("bookings.errors.bookingNotFound")
      }

      if (booking.professionalId) {
        throw new Error("bookings.errors.bookingAlreadyHasProfessional")
      }

      if (["completed", "cancelled", "refunded"].includes(booking.status)) {
        throw new Error("bookings.errors.bookingCannotBeAssigned")
      }

      booking.professionalId = new mongoose.Types.ObjectId(professionalId)
      booking.status = "confirmed"
      await booking.save({ session: mongooseDbSession })
      assignedBooking = booking.toObject()
    })

    if (assignedBooking) {
      revalidatePath("/dashboard/admin/bookings")
      revalidatePath(`/dashboard/professional/booking-management/${bookingId}`)

      // Send notifications to client and professional
      try {
        const [clientUser, professional, treatment] = await Promise.all([
          User.findById(assignedBooking.userId)
            .select("name email phone notificationPreferences")
            .lean(),
          User.findById(professionalId).select("name email phone notificationPreferences").lean(),
          Treatment.findById(assignedBooking.treatmentId).select("name").lean(),
        ])

        if (clientUser && professional && treatment) {
          // Client notification
          const clientLang =
            (clientUser.notificationPreferences?.language as NotificationLanguage) || "he"
          const clientNotificationMethods = clientUser.notificationPreferences?.methods || ["sms"]

          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ""
          const clientNotificationData: ProfessionalBookingNotificationData = {
            type: "BOOKING_ASSIGNED_PROFESSIONAL",
            treatmentName: treatment.name,
            bookingDateTime: assignedBooking.bookingDateTime,
            professionalName: professional.name || "מטפל/ת",
            clientName: clientUser.name || "לקוח/ה",
            userName: clientUser.name || "לקוח/ה",
            bookingDetailsLink: `${baseUrl}/dashboard/member/bookings?bookingId=${assignedBooking._id.toString()}`,
          }

          const clientRecipients = []
          if (clientNotificationMethods.includes("email") && clientUser.email) {
            clientRecipients.push({
              type: "email" as const,
              value: clientUser.email,
              name: clientUser.name,
              language: clientLang,
            })
          }
          if (clientNotificationMethods.includes("sms") && clientUser.phone) {
            clientRecipients.push({
              type: "phone" as const,
              value: clientUser.phone,
              language: clientLang,
            })
          }

          if (clientRecipients.length > 0) {
            await unifiedNotificationService.sendNotificationToMultiple(
              clientRecipients,
              clientNotificationData
            )
          }

          // Professional notification
          const professionalLang =
            (professional.notificationPreferences?.language as NotificationLanguage) || "he"
          const professionalNotificationMethods = professional.notificationPreferences?.methods || [
            "sms",
          ]

          const professionalNotificationData: ProfessionalBookingNotificationData = {
            type: "BOOKING_ASSIGNED_PROFESSIONAL",
            treatmentName: treatment.name,
            bookingDateTime: assignedBooking.bookingDateTime,
            professionalName: professional.name || "מטפל/ת",
            clientName: clientUser.name || "לקוח/ה",
            bookingDetailsLink: `${process.env.NEXTAUTH_URL || ""}/dashboard/professional/booking-management/${assignedBooking._id.toString()}`,
          }

          const professionalRecipients = []
          if (professionalNotificationMethods.includes("email") && professional.email) {
            professionalRecipients.push({
              type: "email" as const,
              value: professional.email,
              name: professional.name,
              language: professionalLang,
            })
          }
          if (professionalNotificationMethods.includes("sms") && professional.phone) {
            professionalRecipients.push({
              type: "phone" as const,
              value: professional.phone,
              language: professionalLang,
            })
          }

          if (professionalRecipients.length > 0) {
            await unifiedNotificationService.sendNotificationToMultiple(
              professionalRecipients,
              professionalNotificationData
            )
          }
        }
      } catch (notificationError) {
        logger.error("Failed to send booking assignment notifications:", {
          error: notificationError,
          bookingId,
          professionalId,
        })
      }

      return { success: true, booking: assignedBooking }
    }

    return { success: false, error: "bookings.errors.assignProfessionalFailed" }
  } catch (error) {
    logger.error("Error in assignProfessionalToBooking:", { error, bookingId, professionalId })
    const errorMessage =
      error instanceof Error ? error.message : "bookings.errors.assignProfessionalFailed"
    return {
      success: false,
      error: errorMessage.startsWith("bookings.errors.")
        ? errorMessage
        : "bookings.errors.assignProfessionalFailed",
    }
  } finally {
    await mongooseDbSession.endSession()
  }
}

/**
 * Admin unassigns professional from booking
 */
export async function unassignProfessionalFromBooking(
  bookingId: string
): Promise<{ success: boolean; error?: string; booking?: IBooking }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  try {
    await dbConnect()
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }

    if (!booking.professionalId) {
      return { success: false, error: "bookings.errors.bookingHasNoProfessional" }
    }

    if (["completed", "cancelled", "refunded"].includes(booking.status)) {
      return { success: false, error: "bookings.errors.bookingCannotBeUnassigned" }
    }

    booking.professionalId = undefined
    booking.status = "in_process" // Reset to in_process when unassigning
    await booking.save()

    revalidatePath("/dashboard/admin/bookings")
    revalidatePath("/dashboard/professional/bookings")

    return { success: true, booking: booking.toObject() }
  } catch (error) {
    logger.error("Error in unassignProfessionalFromBooking:", { error, bookingId })
    return { success: false, error: "bookings.errors.unassignProfessionalFailed" }
  }
}

/**
 * Get available professionals for assignment
 */
export async function getAvailableProfessionals(): Promise<{
  success: boolean
  professionals?: any[]
  error?: string
}> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  try {
    await dbConnect()

    // Import ProfessionalProfile model
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default

    // Get all active professionals with proper population
    const professionals = await ProfessionalProfile.find({
      status: "active",
      isActive: true,
    })
      .populate({
        path: "userId",
        select: "name email phone gender roles",
        // Only get users who have professional role
        match: { roles: "professional" },
      })
      .lean()

    // Filter out professionals where userId is null (didn't match professional role)
    const validProfessionals = professionals.filter(prof => prof.userId !== null)

    return {
      success: true,
      professionals: validProfessionals.map((p: any) => ({
        _id: p.userId._id.toString(),
        name: p.userId.name,
        email: p.userId.email,
        phone: p.userId.phone,
        gender: p.userId.gender,
        profileId: p._id.toString(),
        workAreas: p.workAreas,
        treatments: p.treatments,
      })),
    }
  } catch (error) {
    logger.error("Error in getAvailableProfessionals:", { error })
    return { success: false, error: "bookings.errors.fetchProfessionalsFailed" }
  }
}

/**
 * Find suitable professionals for a booking
 */
export async function findSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; professionals?: any[]; error?: string }> {
  try {
    await dbConnect()

    const booking = await Booking.findById(bookingId).populate("treatmentId").lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    // Import ProfessionalProfile model
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default

    // Find professionals who can perform this treatment in this area
    const suitableProfessionals = await ProfessionalProfile.find({
      status: "active",
      isActive: true,
      treatments: booking.treatmentId,
      workAreas: { $in: [booking.bookingAddressSnapshot?.city] },
    })
      .populate({
        path: "userId",
        select: "name email phone gender roles",
        match: { roles: "professional" },
      })
      .lean()

    // Filter out professionals where userId is null
    const validProfessionals = suitableProfessionals.filter(prof => prof.userId !== null)

    return {
      success: true,
      professionals: validProfessionals.map((p: any) => ({
        _id: p.userId._id.toString(),
        name: p.userId.name,
        email: p.userId.email,
        phone: p.userId.phone,
        gender: p.userId.gender,
        profileId: p._id.toString(),
        workAreas: p.workAreas,
        treatments: p.treatments,
      })),
    }
  } catch (error) {
    logger.error("Error finding suitable professionals:", { error, bookingId })
    return { success: false, error: "Failed to find suitable professionals" }
  }
}

/**
 * Send notification to suitable professionals
 */
export async function sendNotificationToSuitableProfessionals(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("admin")) {
    return { success: false, error: "common.unauthorized" }
  }

  try {
    const professionalsResult = await findSuitableProfessionals(bookingId)
    if (!professionalsResult.success || !professionalsResult.professionals) {
      return { success: false, error: "No suitable professionals found" }
    }

    const booking = await Booking.findById(bookingId).populate("treatmentId").lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    let sentCount = 0
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || ""

    for (const professional of professionalsResult.professionals) {
      try {
        const notificationData: ProfessionalBookingNotificationData = {
          type: "NEW_BOOKING_AVAILABLE",
          treatmentName: (booking.treatmentId as any).name,
          bookingDateTime: booking.bookingDateTime,
          professionalName: professional.name,
          clientName: booking.recipientName || "לקוח/ה",
          bookingDetailsLink: `${baseUrl}/dashboard/professional/booking-management/${bookingId}`,
        }

        const recipients = []
        if (professional.email) {
          recipients.push({
            type: "email" as const,
            value: professional.email,
            name: professional.name,
            language: "he" as NotificationLanguage,
          })
        }
        if (professional.phone) {
          recipients.push({
            type: "phone" as const,
            value: professional.phone,
            language: "he" as NotificationLanguage,
          })
        }

        if (recipients.length > 0) {
          await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData)
          sentCount++
        }
      } catch (error) {
        logger.error("Failed to send notification to professional:", {
          error,
          professionalId: professional._id,
        })
      }
    }

    return { success: true, sentCount }
  } catch (error) {
    logger.error("Error sending notifications to suitable professionals:", { error, bookingId })
    return { success: false, error: "Failed to send notifications" }
  }
}
