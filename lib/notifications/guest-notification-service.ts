import { logger } from "@/lib/logs/logger"
import { emailService } from "./email-service"
import { smsService } from "./sms-service"

export interface GuestInfo {
  name: string
  email?: string
  phone?: string
  language: string
}

export interface NotificationData {
  type: "treatment-booking-success"
  recipientName: string
  bookerName?: string
  treatmentName: string
  bookingDateTime: Date
  bookingNumber: string
  bookingAddress: string
  isForSomeoneElse: boolean
  isBookerForSomeoneElse?: boolean
  actualRecipientName?: string
}

export async function sendGuestNotification(
  guestInfo: GuestInfo,
  notificationData: NotificationData
): Promise<void> {
  try {
    const promises: Promise<any>[] = []

    // Send email notification if email is provided
    if (guestInfo.email) {
      promises.push(sendEmailNotification(guestInfo, notificationData))
    }

    // Send SMS notification if phone is provided
    if (guestInfo.phone) {
      promises.push(sendSMSNotification(guestInfo, notificationData))
    }

    if (promises.length === 0) {
      logger.warn("No notification methods available for guest", {
        guestName: guestInfo.name,
        bookingNumber: notificationData.bookingNumber
      })
      return
    }

    // Send all notifications in parallel
    const results = await Promise.allSettled(promises)
    
    // Log results
    results.forEach((result, index) => {
      const method = index === 0 ? "email" : "sms"
      if (result.status === "fulfilled") {
        logger.info(`Guest ${method} notification sent successfully`, {
          guestName: guestInfo.name,
          bookingNumber: notificationData.bookingNumber,
          method
        })
      } else {
        logger.error(`Failed to send guest ${method} notification`, {
          guestName: guestInfo.name,
          bookingNumber: notificationData.bookingNumber,
          method,
          error: result.reason
        })
      }
    })

  } catch (error) {
    logger.error("Error sending guest notifications:", {
      guestName: guestInfo.name,
      bookingNumber: notificationData.bookingNumber,
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

async function sendEmailNotification(
  guestInfo: GuestInfo,
  notificationData: NotificationData
): Promise<void> {
  // Create a simple notification that will work with the existing template system
  const simpleNotificationData = {
    type: "booking-confirmation" as const,
    bookingNumber: notificationData.bookingNumber,
    treatmentName: notificationData.treatmentName,
    bookingDateTime: notificationData.bookingDateTime,
    bookingAddress: notificationData.bookingAddress,
    recipientName: notificationData.recipientName,
    bookerName: notificationData.bookerName,
    isForSomeoneElse: notificationData.isForSomeoneElse,
    bookingDetailsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-details/${notificationData.bookingNumber}`
  }

  await emailService.sendNotification(
    {
      value: guestInfo.email!,
      name: guestInfo.name,
      language: guestInfo.language
    },
    simpleNotificationData
  )
}

async function sendSMSNotification(
  guestInfo: GuestInfo,
  notificationData: NotificationData
): Promise<void> {
  // Create a simple notification that will work with the existing template system
  const simpleNotificationData = {
    type: "booking-confirmation" as const,
    bookingNumber: notificationData.bookingNumber,
    treatmentName: notificationData.treatmentName,
    bookingDateTime: notificationData.bookingDateTime,
    bookingAddress: notificationData.bookingAddress,
    recipientName: notificationData.recipientName,
    bookerName: notificationData.bookerName,
    isForSomeoneElse: notificationData.isForSomeoneElse,
    bookingDetailsUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/booking-details/${notificationData.bookingNumber}`
  }

  await smsService.sendNotification(
    {
      value: guestInfo.phone!,
      name: guestInfo.name,
      language: guestInfo.language
    },
    simpleNotificationData
  )
} 