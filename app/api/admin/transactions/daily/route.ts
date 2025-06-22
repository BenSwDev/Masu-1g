import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth/require-admin-session"
import { connectDB } from "@/lib/db/mongodb"

export const dynamic = 'force-dynamic'

interface DailyTransactionDetail {
  id: string
  type: 'booking' | 'voucher_new' | 'voucher_redeemed' | 'subscription_new' | 'subscription_redeemed' | 'coupon_new' | 'coupon_redeemed' | 'partner_coupon_new' | 'partner_coupon_redeemed'
  time: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  amount: number
  professionalCost?: number
  description: string
  status: string
  paymentMethod?: string
  transactionId: string
}

interface DailySummary {
  date: string
  dayName: string
  totalTransactions: number
  totalRevenue: number
  totalRedemptions: number
  totalProfessionalCosts: number
  totalOfficeProfit: number
  breakdown: {
    bookings: { count: number; amount: number }
    newVouchers: { count: number; amount: number }
    redeemedVouchers: { count: number; amount: number }
    newSubscriptions: { count: number; amount: number }
    redeemedSubscriptions: { count: number; amount: number }
    newCoupons: { count: number; amount: number }
    redeemedCoupons: { count: number; amount: number }
    newPartnerCoupons: { count: number; amount: number }
    redeemedPartnerCoupons: { count: number; amount: number }
  }
}

interface DailyTransactionData {
  summary: DailySummary
  transactions: DailyTransactionDetail[]
}

// Helper function to get day name in Hebrew
function getHebrewDayName(date: Date): string {
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
  return days[date.getDay()]
}

// Helper function to calculate professional costs
function calculateProfessionalCosts(bookingAmount: number): number {
  return bookingAmount * 0.7
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession()
    
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const targetDate = new Date(date)
    
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const dayStart = new Date(targetDate)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(targetDate)
    dayEnd.setHours(23, 59, 59, 999)

    const client = await connectDB()
    const db = client.db()
    
    const transactions: DailyTransactionDetail[] = []
    const summary: DailySummary = {
      date,
      dayName: getHebrewDayName(targetDate),
      totalTransactions: 0,
      totalRevenue: 0,
      totalRedemptions: 0,
      totalProfessionalCosts: 0,
      totalOfficeProfit: 0,
      breakdown: {
        bookings: { count: 0, amount: 0 },
        newVouchers: { count: 0, amount: 0 },
        redeemedVouchers: { count: 0, amount: 0 },
        newSubscriptions: { count: 0, amount: 0 },
        redeemedSubscriptions: { count: 0, amount: 0 },
        newCoupons: { count: 0, amount: 0 },
        redeemedCoupons: { count: 0, amount: 0 },
        newPartnerCoupons: { count: 0, amount: 0 },
        redeemedPartnerCoupons: { count: 0, amount: 0 }
      }
    }

    // Get bookings data
    const bookings = await db.collection('bookings').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['confirmed', 'completed'] }
    }).toArray()

    for (const booking of bookings) {
      const customer = booking.userId ? await db.collection('users').findOne({ _id: booking.userId }) : null
      
      transactions.push({
        id: booking._id.toString(),
        type: 'booking',
        time: booking.createdAt.toISOString(),
        customerName: customer?.name || booking.guestInfo?.name,
        customerEmail: customer?.email || booking.guestInfo?.email,
        customerPhone: customer?.phone || booking.guestInfo?.phone,
        amount: booking.totalAmount || 0,
        professionalCost: calculateProfessionalCosts(booking.totalAmount || 0),
        description: `הזמנת טיפול: ${booking.treatmentName || 'לא צוין'}`,
        status: booking.status,
        paymentMethod: booking.payment?.method,
        transactionId: booking.transactionId || booking._id.toString()
      })

      summary.breakdown.bookings.count++
      summary.breakdown.bookings.amount += booking.totalAmount || 0
    }

    // Get gift vouchers data
    const newVouchers = await db.collection('gift-vouchers').find({
      createdAt: { $gte: dayStart, $lte: dayEnd }
    }).toArray()

    for (const voucher of newVouchers) {
      const customer = voucher.purchasedBy ? await db.collection('users').findOne({ _id: voucher.purchasedBy }) : null
      
      transactions.push({
        id: voucher._id.toString(),
        type: 'voucher_new',
        time: voucher.createdAt.toISOString(),
        customerName: customer?.name,
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        amount: voucher.monetaryValue || voucher.treatmentValue || 0,
        description: `רכישת שובר מתנה: ${voucher.type === 'monetary' ? 'כספי' : 'טיפול'}`,
        status: voucher.status || 'active',
        transactionId: voucher.code || voucher._id.toString()
      })

      summary.breakdown.newVouchers.count++
      summary.breakdown.newVouchers.amount += voucher.monetaryValue || voucher.treatmentValue || 0
    }

    // Get redeemed vouchers data
    const redeemedVouchers = await db.collection('bookings').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      'payment.giftVoucherId': { $exists: true, $ne: null }
    }).toArray()

    for (const booking of redeemedVouchers) {
      const customer = booking.userId ? await db.collection('users').findOne({ _id: booking.userId }) : null
      
      transactions.push({
        id: `${booking._id.toString()}_voucher_redeemed`,
        type: 'voucher_redeemed',
        time: booking.createdAt.toISOString(),
        customerName: customer?.name || booking.guestInfo?.name,
        customerEmail: customer?.email || booking.guestInfo?.email,
        customerPhone: customer?.phone || booking.guestInfo?.phone,
        amount: -(booking.payment?.voucherDiscount || 0),
        description: `מימוש שובר מתנה בהזמנה`,
        status: 'redeemed',
        transactionId: booking.payment?.giftVoucherId || booking._id.toString()
      })

      summary.breakdown.redeemedVouchers.count++
      summary.breakdown.redeemedVouchers.amount += booking.payment?.voucherDiscount || 0
    }

    // Get user subscriptions data
    const newSubscriptions = await db.collection('user-subscriptions').find({
      createdAt: { $gte: dayStart, $lte: dayEnd }
    }).toArray()

    for (const subscription of newSubscriptions) {
      const customer = await db.collection('users').findOne({ _id: subscription.userId })
      const subscriptionDetails = await db.collection('subscriptions').findOne({ _id: subscription.subscriptionId })
      
      transactions.push({
        id: subscription._id.toString(),
        type: 'subscription_new',
        time: subscription.createdAt.toISOString(),
        customerName: customer?.name,
        customerEmail: customer?.email,
        customerPhone: customer?.phone,
        amount: subscription.amount || 0,
        description: `רכישת מנוי: ${subscriptionDetails?.name || 'לא צוין'}`,
        status: subscription.status || 'active',
        transactionId: subscription.transactionId || subscription._id.toString()
      })

      summary.breakdown.newSubscriptions.count++
      summary.breakdown.newSubscriptions.amount += subscription.amount || 0
    }

    // Get redeemed subscriptions
    const redeemedSubscriptions = await db.collection('bookings').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      'payment.userSubscriptionId': { $exists: true, $ne: null }
    }).toArray()

    for (const booking of redeemedSubscriptions) {
      const customer = booking.userId ? await db.collection('users').findOne({ _id: booking.userId }) : null
      
      transactions.push({
        id: `${booking._id.toString()}_subscription_redeemed`,
        type: 'subscription_redeemed',
        time: booking.createdAt.toISOString(),
        customerName: customer?.name || booking.guestInfo?.name,
        customerEmail: customer?.email || booking.guestInfo?.email,
        customerPhone: customer?.phone || booking.guestInfo?.phone,
        amount: -(booking.payment?.subscriptionDiscount || 0),
        description: `מימוש מנוי בהזמנה`,
        status: 'redeemed',
        transactionId: booking.payment?.userSubscriptionId || booking._id.toString()
      })

      summary.breakdown.redeemedSubscriptions.count++
      summary.breakdown.redeemedSubscriptions.amount += booking.payment?.subscriptionDiscount || 0
    }

    // Sort transactions by time
    transactions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    // Calculate summary totals
    summary.totalTransactions = transactions.length
    summary.totalRevenue = 
      summary.breakdown.bookings.amount + 
      summary.breakdown.newVouchers.amount + 
      summary.breakdown.newSubscriptions.amount

    summary.totalRedemptions = 
      summary.breakdown.redeemedVouchers.amount + 
      summary.breakdown.redeemedSubscriptions.amount

    summary.totalProfessionalCosts = calculateProfessionalCosts(summary.breakdown.bookings.amount)
    summary.totalOfficeProfit = summary.totalRevenue - summary.totalProfessionalCosts - summary.totalRedemptions

    const response: DailyTransactionData = {
      summary,
      transactions
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in daily transactions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 