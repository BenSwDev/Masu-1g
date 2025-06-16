"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import mongoose from "mongoose"
import { smsService } from "@/lib/notifications/sms-service"
import { getSMSTemplate } from "@/lib/notifications/templates/sms-templates"
import { notificationManager } from "@/lib/notifications/notification-manager"
import { revalidatePath } from "next/cache"

// Send SMS notifications to suitable professionals
export async function sendProfessionalNotifications(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  try {
    await dbConnect()
    
    // Import models
    const Booking = (await import("@/lib/db/models/booking")).default
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    const User = (await import("@/lib/db/models/user")).default
    const Treatment = (await import("@/lib/db/models/treatment")).default
    
    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate('treatmentId')
      .populate('selectedDurationId')
    
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }
    
    // Allow sending notifications for both "confirmed" and "in_process" status
    if (!["confirmed", "in_process"].includes(booking.status)) {
      return { success: false, error: "Booking is not in correct status for notifications" }
    }
    
    // Find suitable professionals using existing logic
    const { findSuitableProfessionals } = await import("@/actions/booking-actions")
    const suitableResult = await findSuitableProfessionals(bookingId)
    
    if (!suitableResult.success || !suitableResult.professionals) {
      return { success: false, error: "No suitable professionals found" }
    }
    
    const professionals = suitableResult.professionals
    let sentCount = 0
    
    // Prepare notification data
    const treatmentName = booking.treatmentId?.name || "טיפול"
    const bookingDateTime = booking.bookingDateTime
    const address = `${booking.bookingAddressSnapshot?.street || ""} ${booking.bookingAddressSnapshot?.houseNumber || ""}, ${booking.bookingAddressSnapshot?.city || ""}`
    const price = booking.priceDetails?.finalAmount || 0
    
    // Send SMS to each suitable professional
    for (const professional of professionals) {
      try {
        if (!professional.userId?.phone) {
          console.log(`Professional ${professional.userId?.name} has no phone number`)
          continue
        }
        
        // Create response record first
        const response = new ProfessionalResponse({
          bookingId: new mongoose.Types.ObjectId(bookingId),
          professionalId: professional.userId._id,
          phoneNumber: professional.userId.phone,
          status: "pending",
          expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
        })
        
        await response.save()
        
        // Prepare notification content
        const responseLink = `${process.env.NEXT_PUBLIC_APP_URL}/professional/booking-response/${response._id.toString()}`
        const notificationData = {
          type: "professional-booking-notification" as const,
          treatmentName,
          bookingDateTime,
          address,
          price,
          responseLink
        }

        // Get user's preferred language (default to Hebrew)
        const userLanguage = professional.userId.preferredLanguage || "he"
        const smsContent = getSMSTemplate({
          ...notificationData,
          responseId: response._id.toString()
        }, userLanguage as "he" | "en" | "ru")

        // Send SMS
        const smsResult = await smsService.sendNotification(
          {
            value: professional.userId.phone,
            language: userLanguage as "he" | "en" | "ru"
          },
          { ...notificationData, responseId: response._id.toString() }
        )

        if (smsResult.success) {
          // Update response with SMS message ID
          response.smsMessageId = smsResult.messageId
          await response.save()
          sentCount++

          console.log(`✅ SMS sent to professional ${professional.userId.name} (${professional.userId.phone})`)
        } else {
          console.error(`❌ Failed to send SMS to ${professional.userId.name}:`, smsResult.error)
          // Mark response as failed
          response.status = "expired"
          await response.save()
        }

        // Send email if available
        if (professional.userId.email) {
          await notificationManager.sendNotification(
            {
              type: "email",
              value: professional.userId.email,
              name: professional.userId.name,
              language: userLanguage as any
            },
            notificationData
          )
        }
        
      } catch (error) {
        console.error(`Error sending SMS to professional ${professional.userId?.name}:`, error)
      }
    }
    
    console.log(`📱 Sent ${sentCount} SMS notifications for booking ${bookingId}`)
    
    return { success: true, sentCount }
    
  } catch (error) {
    console.error("Error sending professional notifications:", error)
    return { success: false, error: "Failed to send notifications" }
  }
}

// Handle professional response (accept/decline)
export async function handleProfessionalResponse(
  responseId: string,
  action: "accept" | "decline",
  responseMethod: "sms" | "app" | "phone" = "sms"
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    await dbConnect()
    
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    const Booking = (await import("@/lib/db/models/booking")).default
    
    // Find the response
    const response = await ProfessionalResponse.findById(responseId)
      .populate('professionalId', 'name phone')
      .populate('bookingId')
    
    if (!response) {
      return { success: false, error: "Response not found" }
    }
    
    // Check if response is still valid
    if (response.status !== "pending") {
      return { success: false, error: "Response already processed or expired" }
    }
    
    if (response.expiresAt < new Date()) {
      response.status = "expired"
      await response.save()
      return { success: false, error: "Response has expired" }
    }
    
    // Check if booking is still available
    const booking = response.bookingId
    if (!booking || booking.status !== "in_process" || booking.professionalId) {
      return { success: false, error: "Booking is no longer available" }
    }
    
    if (action === "accept") {
      // Accept the booking
      await response.accept(responseMethod)
      
      // Assign professional to booking
      const { assignProfessionalToBooking } = await import("@/actions/booking-actions")
      const assignResult = await assignProfessionalToBooking(
        booking._id.toString(),
        response.professionalId._id.toString()
      )
      
      if (assignResult.success) {
        // Mark all other pending responses for this booking as expired
        await ProfessionalResponse.updateMany(
          {
            bookingId: booking._id,
            _id: { $ne: response._id },
            status: "pending"
          },
          {
            status: "expired"
          }
        )
        
        revalidatePath("/dashboard/admin/bookings")
        revalidatePath("/dashboard/professional/booking-management")
        
        return { 
          success: true, 
          message: `ההזמנה נקבלה בהצלחה! תוכל לראות את הפרטים באפליקציה.` 
        }
      } else {
        // Revert response status
        response.status = "pending"
        await response.save()
        return { success: false, error: "Failed to assign booking" }
      }
      
    } else if (action === "decline") {
      // Decline the booking
      await response.decline(responseMethod)
      
      return { 
        success: true, 
        message: `ההזמנה נדחתה. תודה על המענה המהיר.` 
      }
    }
    
    return { success: false, error: "Invalid action" }
    
  } catch (error) {
    console.error("Error handling professional response:", error)
    return { success: false, error: "Failed to process response" }
  }
}

// Get professional responses for a booking (admin view)
export async function getProfessionalResponses(
  bookingId: string
): Promise<{ success: boolean; responses?: any[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }
    
    await dbConnect()
    
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    
    const responses = await ProfessionalResponse.find({
      bookingId: new mongoose.Types.ObjectId(bookingId)
    })
    .populate('professionalId', 'name phone email')
    .sort({ sentAt: -1 })
    .lean()
    
    return { success: true, responses }
    
  } catch (error) {
    console.error("Error getting professional responses:", error)
    return { success: false, error: "Failed to get responses" }
  }
}

// Expire old pending responses (to be called by cron job)
export async function expireOldResponses(): Promise<{ success: boolean; expiredCount?: number; error?: string }> {
  try {
    await dbConnect()
    
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    
    const result = await ProfessionalResponse.updateMany(
      {
        status: "pending",
        expiresAt: { $lt: new Date() }
      },
      {
        status: "expired"
      }
    )
    
    console.log(`⏰ Expired ${result.modifiedCount} old professional responses`)
    
    return { success: true, expiredCount: result.modifiedCount }
    
  } catch (error) {
    console.error("Error expiring old responses:", error)
    return { success: false, error: "Failed to expire responses" }
  }
}

// Resend notifications to available professionals (if no one responded)
export async function resendProfessionalNotifications(
  bookingId: string
): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== "admin") {
      return { success: false, error: "Unauthorized" }
    }
    
    await dbConnect()
    
    const Booking = (await import("@/lib/db/models/booking")).default
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default
    
    // Check booking status
    const booking = await Booking.findById(bookingId)
    if (!booking || booking.status !== "confirmed" || booking.professionalId) {
      return { success: false, error: "Booking is not available for assignment" }
    }
    
    // Expire all pending responses for this booking
    await ProfessionalResponse.updateMany(
      {
        bookingId: new mongoose.Types.ObjectId(bookingId),
        status: "pending"
      },
      {
        status: "expired"
      }
    )
    
    // Send new notifications
    return await sendProfessionalNotifications(bookingId)
    
  } catch (error) {
    console.error("Error resending professional notifications:", error)
    return { success: false, error: "Failed to resend notifications" }
  }
} 