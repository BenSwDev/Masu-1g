"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { GiftVoucher } from "@/lib/db/models/gift-voucher"
import { connectToDatabase } from "@/lib/db/mongodb"
import { logger } from "@/lib/logs/logger"
import { UserRole } from "@/lib/db/models/user"
import { NotificationManager } from "@/lib/notifications/notification-manager"
import { NotificationType } from "@/lib/notifications/notification-types"

// Create a new gift voucher
export async function createGiftVoucher(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    // Generate a unique voucher code
    const code = await GiftVoucher.generateUniqueCode()

    const amount = Number.parseFloat(formData.get("amount") as string)
    const currency = (formData.get("currency") as string) || "ILS"

    // Calculate expiry date (1 year from now by default)
    const expiryDate = new Date()
    expiryDate.setFullYear(expiryDate.getFullYear() + 1)

    const recipientEmail = formData.get("recipientEmail") as string
    const recipientName = formData.get("recipientName") as string
    const recipientPhone = formData.get("recipientPhone") as string
    const message = formData.get("message") as string
    const transactionId = formData.get("transactionId") as string

    // Create new gift voucher
    const giftVoucher = new GiftVoucher({
      code,
      amount,
      currency,
      isActive: true,
      expiryDate,
      purchasedBy: session.user.id,
      purchasedAt: new Date(),
      recipientEmail,
      recipientName,
      recipientPhone,
      message,
      isRedeemed: false,
      transactionId,
    })

    await giftVoucher.save()

    // Send notification to recipient if email is provided
    if (recipientEmail) {
      const notificationManager = new NotificationManager()
      await notificationManager.sendNotification({
        type: NotificationType.GIFT_VOUCHER_CREATED,
        recipient: {
          email: recipientEmail,
          name: recipientName,
          phone: recipientPhone,
        },
        data: {
          voucherCode: code,
          amount,
          currency,
          expiryDate,
          message,
          senderName: session.user.name,
        },
      })
    }

    revalidatePath("/dashboard/member/gift-vouchers")
    return { success: true, giftVoucher }
  } catch (error) {
    logger.error("Error creating gift voucher:", error)
    return { success: false, message: "server_error" }
  }
}

// Get all gift vouchers (admin)
export async function getAllGiftVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    // Check if user has admin role
    if (!session.user.roles.includes(UserRole.ADMIN)) {
      return { success: false, message: "forbidden" }
    }

    await connectToDatabase()

    const giftVouchers = await GiftVoucher.find()
      .sort({ createdAt: -1 })
      .populate("purchasedBy", "name email")
      .populate("redeemedBy", "name email")

    return { success: true, giftVouchers }
  } catch (error) {
    logger.error("Error getting all gift vouchers:", error)
    return { success: false, message: "server_error" }
  }
}

// Get gift voucher by ID
export async function getGiftVoucherById(voucherId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    const giftVoucher = await GiftVoucher.findById(voucherId)
      .populate("purchasedBy", "name email")
      .populate("redeemedBy", "name email")

    if (!giftVoucher) {
      return { success: false, message: "gift_voucher_not_found" }
    }

    // Check if user is admin, the purchaser, or the redeemer
    const isAdmin = session.user.roles.includes(UserRole.ADMIN)
    const isPurchaser = giftVoucher.purchasedBy._id.toString() === session.user.id
    const isRedeemer = giftVoucher.redeemedBy && giftVoucher.redeemedBy._id.toString() === session.user.id

    if (!isAdmin && !isPurchaser && !isRedeemer) {
      return { success: false, message: "forbidden" }
    }

    return { success: true, giftVoucher }
  } catch (error) {
    logger.error("Error getting gift voucher by ID:", error)
    return { success: false, message: "server_error" }
  }
}

// Get user's gift vouchers
export async function getUserGiftVouchers() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    // Get vouchers purchased by the user
    const purchasedVouchers = await GiftVoucher.find({
      purchasedBy: session.user.id,
    }).sort({ createdAt: -1 })

    // Get vouchers redeemed by the user
    const redeemedVouchers = await GiftVoucher.find({
      redeemedBy: session.user.id,
    }).sort({ redeemedAt: -1 })

    return {
      success: true,
      purchasedVouchers,
      redeemedVouchers,
    }
  } catch (error) {
    logger.error("Error getting user gift vouchers:", error)
    return { success: false, message: "server_error" }
  }
}

// Validate a gift voucher code
export async function validateGiftVoucher(code: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    const giftVoucher = await GiftVoucher.findOne({ code: code.toUpperCase() })
    if (!giftVoucher) {
      return { success: false, message: "gift_voucher_not_found" }
    }

    const validation = giftVoucher.validateRedemption()
    if (!validation.valid) {
      return { success: false, message: validation.message }
    }

    return {
      success: true,
      giftVoucher: {
        _id: giftVoucher._id,
        code: giftVoucher.code,
        amount: giftVoucher.amount,
        currency: giftVoucher.currency,
        expiryDate: giftVoucher.expiryDate,
      },
    }
  } catch (error) {
    logger.error("Error validating gift voucher:", error)
    return { success: false, message: "server_error" }
  }
}

// Redeem a gift voucher
export async function redeemGiftVoucher(code: string, transactionId?: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    const giftVoucher = await GiftVoucher.findOne({ code: code.toUpperCase() })
    if (!giftVoucher) {
      return { success: false, message: "gift_voucher_not_found" }
    }

    // Check if the user is trying to redeem their own voucher
    if (giftVoucher.purchasedBy.toString() === session.user.id) {
      return { success: false, message: "cannot_redeem_own_voucher" }
    }

    const result = await giftVoucher.redeem(session.user.id, transactionId)

    if (result.success) {
      // Send notification to purchaser
      const notificationManager = new NotificationManager()
      await notificationManager.sendNotification({
        type: NotificationType.GIFT_VOUCHER_REDEEMED,
        recipientId: giftVoucher.purchasedBy.toString(),
        data: {
          voucherCode: giftVoucher.code,
          amount: giftVoucher.amount,
          currency: giftVoucher.currency,
          redeemedBy: session.user.name,
          redeemedAt: new Date(),
        },
      })
    }

    revalidatePath("/dashboard/member/gift-vouchers")
    return result
  } catch (error) {
    logger.error("Error redeeming gift voucher:", error)
    return { success: false, message: "server_error" }
  }
}

// Deactivate a gift voucher (admin only)
export async function deactivateGiftVoucher(voucherId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    // Check if user has admin role
    if (!session.user.roles.includes(UserRole.ADMIN)) {
      return { success: false, message: "forbidden" }
    }

    await connectToDatabase()

    const giftVoucher = await GiftVoucher.findById(voucherId)
    if (!giftVoucher) {
      return { success: false, message: "gift_voucher_not_found" }
    }

    giftVoucher.isActive = false
    await giftVoucher.save()

    revalidatePath("/dashboard/admin/gift-vouchers")
    return { success: true }
  } catch (error) {
    logger.error("Error deactivating gift voucher:", error)
    return { success: false, message: "server_error" }
  }
}

// Resend gift voucher notification
export async function resendGiftVoucherNotification(voucherId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return { success: false, message: "unauthorized" }
    }

    await connectToDatabase()

    const giftVoucher = await GiftVoucher.findById(voucherId)
    if (!giftVoucher) {
      return { success: false, message: "gift_voucher_not_found" }
    }

    // Check if user is admin or the purchaser
    const isAdmin = session.user.roles.includes(UserRole.ADMIN)
    const isPurchaser = giftVoucher.purchasedBy.toString() === session.user.id

    if (!isAdmin && !isPurchaser) {
      return { success: false, message: "forbidden" }
    }

    // Check if recipient email exists
    if (!giftVoucher.recipientEmail) {
      return { success: false, message: "no_recipient_email" }
    }

    // Send notification to recipient
    const notificationManager = new NotificationManager()
    await notificationManager.sendNotification({
      type: NotificationType.GIFT_VOUCHER_CREATED,
      recipient: {
        email: giftVoucher.recipientEmail,
        name: giftVoucher.recipientName,
        phone: giftVoucher.recipientPhone,
      },
      data: {
        voucherCode: giftVoucher.code,
        amount: giftVoucher.amount,
        currency: giftVoucher.currency,
        expiryDate: giftVoucher.expiryDate,
        message: giftVoucher.message,
        senderName: session.user.name,
      },
    })

    return { success: true }
  } catch (error) {
    logger.error("Error resending gift voucher notification:", error)
    return { success: false, message: "server_error" }
  }
}
