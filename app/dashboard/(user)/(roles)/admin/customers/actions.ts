"use server"

import { getServerSession } from "next-auth/next"
import { revalidatePath } from "next/cache"
import { Types } from "mongoose"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { User } from "@/lib/db/models/user"
import { Booking } from "@/lib/db/models/booking"
import { UserSubscription } from "@/lib/db/models/user-subscription"
import { IGiftVoucher } from "@/lib/db/models/gift-voucher"
import type { CustomerSummary, PurchaseTransaction } from "@/lib/types/purchase-summary"
import { getAllPurchaseTransactions as getSharedPurchaseTransactions } from "@/actions/purchase-summary-actions"

/**
 * Interface for customer summary result
 */
export interface GetCustomerSummaryResult {
  success: boolean
  data?: CustomerSummary
  error?: string
}

/**
 * Interface for get all customers result
 */
export interface GetAllCustomersResult {
  success: boolean
  data?: {
    customers: CustomerSummary[]
    totalCount: number
    totalPages: number
    currentPage: number
  }
  error?: string
}

/**
 * Interface for get all purchase transactions result
 */
export interface GetAllPurchaseTransactionsResult {
  success: boolean
  data?: {
    transactions: PurchaseTransaction[]
    totalCount: number
    totalPages: number
    currentPage: number
  }
  error?: string
}

/**
 * Get customer summary for admin
 * @param customerId - The ID of the customer to get summary for
 * @returns Customer summary with statistics and activity data
 */
export async function getCustomerSummary(customerId: string): Promise<GetCustomerSummaryResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    if (!Types.ObjectId.isValid(customerId)) {
      return { success: false, error: "Invalid customer ID" }
    }

    await dbConnect()

    const userId = new Types.ObjectId(customerId)

    // Get customer basic info
    const customer = await User.findById(userId).lean()
    if (!customer) {
      return { success: false, error: "Customer not found" }
    }

    // Get bookings
    const bookings = await Booking.find({ userId }).lean()
    const completedBookings = bookings.filter(b => b.status === "completed")
    const cancelledBookings = bookings.filter(
      b => b.status === "cancelled_by_user" || b.status === "cancelled_by_admin"
    )
    const noShowBookings = bookings.filter(b => b.status === "no_show")

    // Get subscriptions
    const userSubscriptions = await UserSubscription.find({ userId }).lean()
    const activeSubscriptions = userSubscriptions.filter(
      s => s.remainingQuantity > 0 && s.expiryDate > new Date()
    )

    // Get vouchers
    const vouchers = await IGiftVoucher.find({
      $or: [{ purchaserUserId: userId }, { ownerUserId: userId }],
    }).lean()
    const activeVouchers = vouchers.filter(
      v => v.status === "active" || v.status === "partially_used"
    )
    const usedVouchers = vouchers.filter(v => v.status === "fully_used")

    // Calculate totals
    const totalBookingSpent = bookings.reduce((sum, b) => sum + b.priceDetails.finalAmount, 0)
    const totalSubscriptionSpent = userSubscriptions.reduce(
      (sum, s) => sum + (s.paymentAmount || 0),
      0
    )
    const totalVoucherSpent = vouchers
      .filter(v => v.purchaserUserId.equals(userId))
      .reduce((sum, v) => sum + v.amount, 0)
    const totalSpent = totalBookingSpent + totalSubscriptionSpent + totalVoucherSpent

    const averageBookingValue = bookings.length > 0 ? totalBookingSpent / bookings.length : 0

    // Find last activity
    const lastBooking = bookings.sort(
      (a, b) => b.bookingDateTime.getTime() - a.bookingDateTime.getTime()
    )[0]
    const lastSubscription = userSubscriptions.sort(
      (a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()
    )[0]
    const lastVoucher = vouchers.sort(
      (a, b) => b.purchaseDate.getTime() - a.purchaseDate.getTime()
    )[0]

    const activities = [
      lastBooking?.bookingDateTime,
      lastSubscription?.purchaseDate,
      lastVoucher?.purchaseDate,
    ].filter(Boolean)

    const lastActivity =
      activities.length > 0
        ? new Date(Math.max(...activities.map(d => d!.getTime())))
        : customer.createdAt

    const customerSummary: CustomerSummary = {
      userId: customer._id.toString(),
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone || "",
      joinDate: customer.createdAt,
      totalSpent,
      totalBookings: bookings.length,
      activeSubscriptions: activeSubscriptions.length,
      activeVouchers: activeVouchers.length,
      lastActivity,
      statistics: {
        completedBookings: completedBookings.length,
        cancelledBookings: cancelledBookings.length,
        noShowBookings: noShowBookings.length,
        totalVouchersPurchased: vouchers.filter(v => v.purchaserUserId.equals(userId)).length,
        totalVouchersUsed: usedVouchers.length,
        totalSubscriptionsPurchased: userSubscriptions.length,
        averageBookingValue,
      },
    }

    return { success: true, data: customerSummary }
  } catch (error) {
    console.error("Error fetching customer summary:", error)
    return { success: false, error: "Failed to fetch customer summary" }
  }
}

/**
 * Get all customers list for admin
 * @param page - Page number for pagination
 * @param limit - Number of items per page
 * @param search - Search term for filtering customers
 * @param userType - Filter by user type (all/guests/members)
 * @returns List of customers with pagination data
 */
export async function getAllCustomers(
  page = 1,
  limit = 20,
  search?: string,
  userType?: "all" | "guests" | "members"
): Promise<GetAllCustomersResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const skip = (page - 1) * limit
    let userQuery: Record<string, unknown> = {}

    // Filter by user type
    if (userType === "guests") {
      userQuery.roles = { $in: ["guest"] }
    } else if (userType === "members") {
      userQuery.roles = { $in: ["member"] }
    } else {
      // Default: show all customers (members and guests)
      userQuery.roles = { $in: ["member", "guest"] }
    }

    if (search) {
      userQuery.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ]
    }

    const totalCount = await User.countDocuments(userQuery)
    const users = await User.find(userQuery).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()

    const customers: CustomerSummary[] = []

    for (const user of users) {
      const summaryResult = await getCustomerSummary(user._id.toString())
      if (summaryResult.success && summaryResult.data) {
        // Add user type information
        const customerWithType = {
          ...summaryResult.data,
          userType: user.roles.includes("guest") ? "guest" : "member",
        }
        customers.push(customerWithType as CustomerSummary)
      }
    }

    return {
      success: true,
      data: {
        customers,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
      },
    }
  } catch (error) {
    console.error("Error fetching all customers:", error)
    return { success: false, error: "Failed to fetch customers" }
  }
}

/**
 * Get all purchase transactions for admin dashboard
 * @param page - Page number for pagination
 * @param limit - Number of items per page
 * @param filters - Optional filters for transactions
 * @returns List of transactions with pagination data
 */
export async function getAllPurchaseTransactions(
  page = 1,
  limit = 20,
  filters?: {
    userId?: string
    type?: ("booking" | "gift_voucher" | "subscription")[]
    status?: string[]
    dateFrom?: Date
    dateTo?: Date
    search?: string
  }
) {
  return getSharedPurchaseTransactions(page, limit, filters)
}
