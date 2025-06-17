"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import mongoose from "mongoose"
import { getNextSequenceValue } from "@/lib/db/models/counter"

import Transaction, { type ITransaction } from "@/lib/db/models/transaction"
import Booking from "@/lib/db/models/booking"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import UserSubscription from "@/lib/db/models/user-subscription"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"
import Subscription from "@/lib/db/models/subscription"
import ProfessionalProfile from "@/lib/db/models/professional-profile"

export interface WeeklyTransactionSummary {
  date: string // YYYY-MM-DD format
  dayName: string // Monday, Tuesday, etc.
  bookingsSalesCount: number // הזמנות
  vouchersSalesCount: number // שוברי מתנה
  subscriptionsSalesCount: number // מנויים
  treatmentCount: number // כמות טיפולים שבוצעו (מספר אנשים)
  grossRevenue: number // הכנסה ברוטו (כל הכסף שנכנס)
  professionalPayments: number // תשלום למטפלים
  netRevenue: number // הכנסה נטו (ברוטו פחות מטפלים)
  professionalBonuses: number // זיכויים למטפלים
  professionalPenalties: number // קנסות למטפלים
  privateVoucherUsage: number // שוברים פרטיים - כמות ניצול
  subscriptionUsage: number // מנויים - כמות ניצול
  partnerVoucherUsage: {
    count: number
    revenue: number
    usage: number
  } // שוברי ספקים - ניצול, כמות, הכנסה
  transactions: ITransaction[]
}

export interface DailyTransactionDetail {
  transactionNumber: string
  type: "booking" | "gift_voucher" | "subscription"
  amount: number
  finalAmount?: number
  time: string
  description: string
  customerName?: string
  status: string
  metadata?: any
}

/**
 * Generate next transaction number in T123456 format
 */
async function generateTransactionNumber(): Promise<string> {
  const sequence = await getNextSequenceValue('transaction')
  return `T${sequence.toString().padStart(6, '0')}`
}

/**
 * Sync missing transactions for all entities without transaction numbers
 */
export async function syncMissingTransactions(): Promise<{
  success: boolean
  synced?: number
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()
    let syncedCount = 0

    // Get existing transaction entity IDs to avoid duplicates
    const existingTransactions = await Transaction.find({}, { entityId: 1, type: 1 }).lean()
    const existingEntityIds = new Set(existingTransactions.map(t => `${t.type}-${t.entityId.toString()}`))

    // Sync bookings
    const bookings = await Booking.find({})
      .populate('userId', 'name email phone')
      .populate('treatmentId', 'name')
      .populate('professionalId', 'name')
      .lean()

    for (const booking of bookings) {
      const key = `booking-${booking._id.toString()}`
      if (!existingEntityIds.has(key)) {
        const transactionNumber = await generateTransactionNumber()
        
        let status: "completed" | "pending" | "cancelled" | "refunded" = "pending"
        if (booking.status === "completed") status = "completed"
        else if (booking.status === "cancelled_by_user" || booking.status === "cancelled_by_admin") status = "cancelled"
        else if (booking.status === "refunded") status = "refunded"

        const transaction = new Transaction({
          transactionNumber,
          type: "booking",
          entityId: booking._id,
          amount: booking.priceDetails.basePrice || 0,
          finalAmount: booking.priceDetails.finalAmount || 0,
          date: booking.createdAt,
          status,
          description: `הזמנת ${(booking.treatmentId as any)?.name || 'טיפול'} - ${booking.bookingNumber}`,
          customerName: booking.bookedByUserName || (booking.userId as any)?.name || 'לקוח אורח',
          customerEmail: booking.bookedByUserEmail || (booking.userId as any)?.email,
          customerPhone: booking.bookedByUserPhone || (booking.userId as any)?.phone,
          metadata: {
            treatmentName: (booking.treatmentId as any)?.name,
            professionalName: (booking.professionalId as any)?.name,
            bookingNumber: booking.bookingNumber
          }
        })
        
        await transaction.save()
        syncedCount++
      }
    }

    // Sync gift vouchers
    const giftVouchers = await GiftVoucher.find({})
      .populate('purchaserUserId', 'name email phone')
      .populate('ownerUserId', 'name email phone')
      .populate('treatmentId', 'name')
      .lean()

    for (const voucher of giftVouchers) {
      const key = `gift_voucher-${voucher._id.toString()}`
      if (!existingEntityIds.has(key)) {
        const transactionNumber = await generateTransactionNumber()
        
        let status: "completed" | "pending" | "cancelled" | "refunded" = "pending"
        if (voucher.status === "active" || voucher.status === "partially_used" || voucher.status === "fully_used") status = "completed"
        else if (voucher.status === "cancelled") status = "cancelled"

        const customerData = voucher.purchaserUserId || voucher.ownerUserId
        
        const transaction = new Transaction({
          transactionNumber,
          type: "gift_voucher",
          entityId: voucher._id,
          amount: voucher.amount,
          finalAmount: voucher.amount,
          date: voucher.createdAt,
          status,
          description: voucher.voucherType === "monetary" 
            ? `שובר כספי ${voucher.amount} ש״ח - ${voucher.code}`
            : `שובר טיפול ${(voucher.treatmentId as any)?.name || 'לא ידוע'} - ${voucher.code}`,
          customerName: (customerData as any)?.name || voucher.guestInfo?.name || 'לקוח אורח',
          customerEmail: (customerData as any)?.email || voucher.guestInfo?.email,
          customerPhone: (customerData as any)?.phone || voucher.guestInfo?.phone,
          metadata: {
            voucherCode: voucher.code,
            treatmentName: voucher.voucherType === "treatment" ? (voucher.treatmentId as any)?.name : undefined
          }
        })
        
        await transaction.save()
        syncedCount++
      }
    }

    // Sync user subscriptions
    const subscriptions = await UserSubscription.find({})
      .populate('userId', 'name email phone')
      .populate('subscriptionId', 'name')
      .populate('treatmentId', 'name')
      .lean()

    for (const subscription of subscriptions) {
      const key = `subscription-${subscription._id.toString()}`
      if (!existingEntityIds.has(key)) {
        const transactionNumber = await generateTransactionNumber()
        
        const status: "completed" | "pending" | "cancelled" | "refunded" = "completed"
        
        const transaction = new Transaction({
          transactionNumber,
          type: "subscription",
          entityId: subscription._id,
          amount: subscription.paymentAmount || 0,
          finalAmount: subscription.paymentAmount || 0,
          date: subscription.createdAt,
          status,
          description: `מנוי ${(subscription.subscriptionId as any)?.name || 'לא ידוע'} - ${(subscription.treatmentId as any)?.name || 'טיפול לא ידוע'}`,
          customerName: (subscription.userId as any)?.name || 'לקוח לא ידוע',
          customerEmail: (subscription.userId as any)?.email,
          customerPhone: (subscription.userId as any)?.phone,
          metadata: {
            subscriptionName: (subscription.subscriptionId as any)?.name,
            treatmentName: (subscription.treatmentId as any)?.name
          }
        })
        
        await transaction.save()
        syncedCount++
      }
    }

    return { success: true, synced: syncedCount }
  } catch (error) {
    console.error("Error syncing missing transactions:", error)
    return { success: false, error: "Failed to sync transactions" }
  }
}

/**
 * Get weekly transaction summary with detailed breakdown
 */
export async function getWeeklyTransactionSummary(): Promise<{
  success: boolean
  data?: WeeklyTransactionSummary[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Get current week (Sunday to Saturday)
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setHours(0, 0, 0, 0)
    startOfWeek.setDate(now.getDate() - now.getDay()) // Sunday
    
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 7)

    const weeklyData: WeeklyTransactionSummary[] = []

    // Generate data for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek)
      currentDate.setDate(startOfWeek.getDate() + i)
      
      const nextDate = new Date(currentDate)
      nextDate.setDate(currentDate.getDate() + 1)

      const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']
      
      // Get transactions for this day
      const dayTransactions = await Transaction.find({
        date: {
          $gte: currentDate,
          $lt: nextDate
        }
      }).sort({ date: -1 }).lean()

      // Get completed bookings for treatment count and professional payments
      const dayBookings = await Booking.find({
        bookingDateTime: {
          $gte: currentDate,
          $lt: nextDate
        },
        status: 'completed'
      })
      .populate('treatmentId', 'pricingType fixedProfessionalPrice durations')
      .populate('selectedDurationId')
      .lean()

      // Calculate professional payments using the same logic as the admin panel
      const professionalPayments = dayBookings.reduce((sum, booking) => {
        let baseProfessionalFee = 0
        const treatment = booking.treatmentId as any
        
        if (treatment) {
          if (treatment.pricingType === "fixed") {
            baseProfessionalFee = treatment.fixedProfessionalPrice || 0
          } else if (treatment.pricingType === "duration_based" && booking.selectedDurationId && treatment.durations) {
            const selectedDuration = treatment.durations.find(
              (d: any) => d._id?.toString() === booking.selectedDurationId?.toString()
            )
            if (selectedDuration) {
              baseProfessionalFee = selectedDuration.professionalPrice || 0
            }
          }
        }

        // Calculate professional share from surcharges
        let surchargeProfessionalShare = 0
        if (booking.priceDetails.surcharges) {
          for (const [key, surcharge] of Object.entries(booking.priceDetails.surcharges as Record<string, any>)) {
            if (surcharge && typeof surcharge.amount === 'number' && surcharge.amount > 0) {
              if (surcharge.professionalShare) {
                if (surcharge.professionalShare.type === 'percentage') {
                  surchargeProfessionalShare += (surcharge.amount * (surcharge.professionalShare.amount / 100))
                } else if (surcharge.professionalShare.type === 'fixed') {
                  surchargeProfessionalShare += surcharge.professionalShare.amount
                }
              }
            }
          }
        }

        return sum + baseProfessionalFee + surchargeProfessionalShare
      }, 0)

      // Calculate gross revenue (all money coming in from all purchases)
      const grossRevenue = dayTransactions
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.finalAmount || t.amount), 0)

      // Calculate net revenue (gross minus professional payments)
      const netRevenue = grossRevenue - professionalPayments

      // Count sales by type
      const bookingsSales = dayTransactions.filter(t => t.type === 'booking' && t.status === 'completed').length
      const vouchersSales = dayTransactions.filter(t => t.type === 'gift_voucher' && t.status === 'completed').length
      const subscriptionsSales = dayTransactions.filter(t => t.type === 'subscription' && t.status === 'completed').length

      // Count treatment instances (number of people receiving treatments)
      // For now, each booking = 1 person as there are no couple treatments yet
      const treatmentCount = dayBookings.length

      // Count voucher and subscription usage
      const voucherUsage = dayBookings.filter(b => b.priceDetails.appliedGiftVoucherId).length
      const subscriptionUsage = dayBookings.filter(b => b.priceDetails.redeemedUserSubscriptionId).length

      // Get professional bonuses and penalties for this day
      let professionalBonuses = 0
      let professionalPenalties = 0

      // Query all professional profiles for financial transactions on this day
      try {
        const professionalProfiles = await ProfessionalProfile.find({
          'financialTransactions.date': {
            $gte: currentDate,
            $lt: nextDate
          }
        }).lean()

        for (const profile of professionalProfiles || []) {
          for (const transaction of profile.financialTransactions || []) {
            const transactionDate = new Date(transaction.date)
            if (transactionDate >= currentDate && transactionDate < nextDate) {
              if (transaction.type === 'bonus') {
                professionalBonuses += transaction.amount || 0
              } else if (transaction.type === 'penalty') {
                professionalPenalties += Math.abs(transaction.amount || 0) // Ensure positive for display
              }
            }
          }
        }
      } catch (profileError) {
        console.warn("Error fetching professional profiles for bonuses/penalties:", profileError)
        // Continue with zeros if there's an error
      }

      const dayData: WeeklyTransactionSummary = {
        date: currentDate.toISOString().split('T')[0],
        dayName: dayNames[currentDate.getDay()],
        bookingsSalesCount: bookingsSales,
        vouchersSalesCount: vouchersSales,
        subscriptionsSalesCount: subscriptionsSales,
        treatmentCount: treatmentCount,
        grossRevenue: Math.round(grossRevenue),
        professionalPayments: Math.round(professionalPayments),
        netRevenue: Math.round(netRevenue),
        professionalBonuses: Math.round(professionalBonuses),
        professionalPenalties: Math.round(professionalPenalties),
        privateVoucherUsage: voucherUsage,
        subscriptionUsage: subscriptionUsage,
        partnerVoucherUsage: {
          count: 0, // Can be enhanced with partner coupon data
          revenue: 0,
          usage: 0
        },
        transactions: dayTransactions
      }

      weeklyData.push(dayData)
    }

    return { success: true, data: weeklyData }
  } catch (error) {
    console.error("Error fetching weekly transaction summary:", error)
    return { success: false, error: "Failed to fetch weekly summary" }
  }
}

/**
 * Get daily transaction details for a specific date
 */
export async function getDailyTransactionDetails(date: string): Promise<{
  success: boolean
  data?: DailyTransactionDetail[]
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.activeRole !== "admin") {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const startDate = new Date(date + 'T00:00:00.000Z')
    const endDate = new Date(date + 'T23:59:59.999Z')

    const transactions = await Transaction.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: -1 }).lean()

    const details: DailyTransactionDetail[] = transactions.map(transaction => ({
      transactionNumber: transaction.transactionNumber,
      type: transaction.type,
      amount: transaction.amount,
      finalAmount: transaction.finalAmount,
      time: transaction.date.toLocaleTimeString('he-IL', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      description: transaction.description,
      customerName: transaction.customerName,
      status: transaction.status,
      metadata: transaction.metadata
    }))

    return { success: true, data: details }
  } catch (error) {
    console.error("Error fetching daily transaction details:", error)
    return { success: false, error: "Failed to fetch daily details" }
  }
} 