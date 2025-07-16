import { logger } from "@/lib/logs/logger"
import { emailService } from "./email-service"
import { smsService } from "./sms-service"
import type { NotificationLanguage } from "./notification-types"

interface GuestInfo {
  name: string
  email?: string
  phone?: string
  language: NotificationLanguage
}

interface NotificationData {
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
  // ➕ הוספת פרטי תשלום מפורטים
  priceDetails?: {
    basePrice: number
    surcharges?: Array<{ description: string; amount: number }>
    totalSurchargesAmount: number
    discountAmount?: number
    voucherAppliedAmount?: number
    couponDiscount?: number
    finalAmount: number
    isFullyCoveredByVoucherOrSubscription?: boolean
    appliedCouponCode?: string
    appliedGiftVoucherCode?: string
    redeemedSubscriptionName?: string
  }
  paymentDetails?: {
    paymentStatus: string
    transactionId?: string
    paymentMethod?: string
  }
  bookingSource?: "new_purchase" | "subscription_redemption" | "gift_voucher_redemption"
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
  // Use the correct notification data type
  await emailService.sendNotification(
    {
      type: "email" as const,
      value: guestInfo.email!,
      name: guestInfo.name,
      language: guestInfo.language
    },
    notificationData
  )
}

async function sendSMSNotification(
  guestInfo: GuestInfo,
  notificationData: NotificationData
): Promise<void> {
  // Use the correct notification data type
  await smsService.sendNotification(
    {
      type: "phone" as const,
      value: guestInfo.phone!,
      language: guestInfo.language
    },
    notificationData
  )
} 