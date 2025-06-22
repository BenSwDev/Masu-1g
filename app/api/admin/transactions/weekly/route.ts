import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth/require-admin-session"
import { connectToDatabase } from "@/lib/db/mongodb"

export const dynamic = 'force-dynamic'

interface DayTransactionData {
  date: string
  dayName: string
  bookings: { count: number; amount: number }
  newVouchers: { count: number; amount: number }
  redeemedVouchers: { count: number; amount: number }
  newSubscriptions: { count: number; amount: number }
  redeemedSubscriptions: { count: number; amount: number }
  newCoupons: { count: number; amount: number }
  redeemedCoupons: { count: number; amount: number }
  newPartnerCoupons: { count: number; amount: number }
  redeemedPartnerCoupons: { count: number; amount: number }
  totalRevenue: number
  totalRedemptions: number
  professionalCosts: number
  officeProfit: number
}

interface WeeklyTransactionData {
  weekStart: string
  weekEnd: string
  days: DayTransactionData[]
  weeklyTotals: Omit<DayTransactionData, 'date' | 'dayName'>
}

// Helper function to get day name in Hebrew
function getHebrewDayName(date: Date): string {
  const days = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
  return days[date.getDay()]
}

// Helper function to calculate professional costs (example: 70% of booking amount)
function calculateProfessionalCosts(bookingAmount: number): number {
  return bookingAmount * 0.7
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAdminSession()
    
    const { searchParams } = new URL(request.url)
    const start = searchParams.get('start')
    const end = searchParams.get('end')
    
    if (!start || !end) {
      return NextResponse.json(
        { error: 'Start and end dates are required' },
        { status: 400 }
      )
    }

    const startDate = new Date(start)
    const endDate = new Date(end)
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const { db } = await connectToDatabase()
    
    // Generate array of days for the week
    const days: DayTransactionData[] = []
    const currentDate = new Date(startDate)
    
    while (currentDate <= endDate) {
      const dayStart = new Date(currentDate)
      dayStart.setHours(0, 0, 0, 0)
      
      const dayEnd = new Date(currentDate)
      dayEnd.setHours(23, 59, 59, 999)
      
      const dateStr = currentDate.toISOString().split('T')[0]
      
      // Initialize day data
      const dayData: DayTransactionData = {
        date: dateStr,
        dayName: getHebrewDayName(currentDate),
        bookings: { count: 0, amount: 0 },
        newVouchers: { count: 0, amount: 0 },
        redeemedVouchers: { count: 0, amount: 0 },
        newSubscriptions: { count: 0, amount: 0 },
        redeemedSubscriptions: { count: 0, amount: 0 },
        newCoupons: { count: 0, amount: 0 },
        redeemedCoupons: { count: 0, amount: 0 },
        newPartnerCoupons: { count: 0, amount: 0 },
        redeemedPartnerCoupons: { count: 0, amount: 0 },
        totalRevenue: 0,
        totalRedemptions: 0,
        professionalCosts: 0,
        officeProfit: 0
      }

      try {
        // Get bookings data
        const bookings = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          status: { $in: ['confirmed', 'completed'] }
        }).toArray()

        dayData.bookings.count = bookings.length
        dayData.bookings.amount = bookings.reduce((sum, booking) => sum + (booking.totalAmount || 0), 0)

        // Get gift vouchers data
        const newVouchers = await db.collection('gift-vouchers').find({
          createdAt: { $gte: dayStart, $lte: dayEnd }
        }).toArray()

        dayData.newVouchers.count = newVouchers.length
        dayData.newVouchers.amount = newVouchers.reduce((sum, voucher) => {
          return sum + (voucher.monetaryValue || voucher.treatmentValue || 0)
        }, 0)

        // Get redeemed vouchers data (bookings that used vouchers)
        const redeemedVouchers = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          'payment.giftVoucherId': { $exists: true, $ne: null }
        }).toArray()

        dayData.redeemedVouchers.count = redeemedVouchers.length
        dayData.redeemedVouchers.amount = redeemedVouchers.reduce((sum, booking) => {
          return sum + (booking.payment?.voucherDiscount || 0)
        }, 0)

        // Get user subscriptions data (new purchases)
        const newSubscriptions = await db.collection('user-subscriptions').find({
          createdAt: { $gte: dayStart, $lte: dayEnd }
        }).toArray()

        dayData.newSubscriptions.count = newSubscriptions.length
        dayData.newSubscriptions.amount = newSubscriptions.reduce((sum, sub) => sum + (sub.amount || 0), 0)

        // Get redeemed subscriptions (bookings that used subscriptions)
        const redeemedSubscriptions = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          'payment.userSubscriptionId': { $exists: true, $ne: null }
        }).toArray()

        dayData.redeemedSubscriptions.count = redeemedSubscriptions.length
        dayData.redeemedSubscriptions.amount = redeemedSubscriptions.reduce((sum, booking) => {
          return sum + (booking.payment?.subscriptionDiscount || 0)
        }, 0)

        // Get coupons data
        const newCoupons = await db.collection('coupons').find({
          createdAt: { $gte: dayStart, $lte: dayEnd }
        }).toArray()

        dayData.newCoupons.count = newCoupons.length
        dayData.newCoupons.amount = newCoupons.reduce((sum, coupon) => {
          return sum + (coupon.discountValue || 0)
        }, 0)

        // Get redeemed coupons
        const redeemedCoupons = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          'payment.couponId': { $exists: true, $ne: null }
        }).toArray()

        dayData.redeemedCoupons.count = redeemedCoupons.length
        dayData.redeemedCoupons.amount = redeemedCoupons.reduce((sum, booking) => {
          return sum + (booking.payment?.couponDiscount || 0)
        }, 0)

        // Get partner coupons data
        const newPartnerCoupons = await db.collection('partner-coupon-batches').find({
          createdAt: { $gte: dayStart, $lte: dayEnd }
        }).toArray()

        dayData.newPartnerCoupons.count = newPartnerCoupons.reduce((sum, batch) => sum + (batch.totalCoupons || 0), 0)
        dayData.newPartnerCoupons.amount = newPartnerCoupons.reduce((sum, batch) => {
          return sum + ((batch.totalCoupons || 0) * (batch.discountValue || 0))
        }, 0)

        // Get redeemed partner coupons
        const redeemedPartnerCoupons = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          'payment.partnerCouponId': { $exists: true, $ne: null }
        }).toArray()

        dayData.redeemedPartnerCoupons.count = redeemedPartnerCoupons.length
        dayData.redeemedPartnerCoupons.amount = redeemedPartnerCoupons.reduce((sum, booking) => {
          return sum + (booking.payment?.partnerCouponDiscount || 0)
        }, 0)

        // Calculate totals
        dayData.totalRevenue = 
          dayData.bookings.amount + 
          dayData.newVouchers.amount + 
          dayData.newSubscriptions.amount

        dayData.totalRedemptions = 
          dayData.redeemedVouchers.amount + 
          dayData.redeemedSubscriptions.amount + 
          dayData.redeemedCoupons.amount + 
          dayData.redeemedPartnerCoupons.amount

        dayData.professionalCosts = calculateProfessionalCosts(dayData.bookings.amount)
        dayData.officeProfit = dayData.totalRevenue - dayData.professionalCosts - dayData.totalRedemptions

      } catch (error) {
        console.error(`Error processing data for ${dateStr}:`, error)
        // Keep default zero values for this day
      }

      days.push(dayData)
      currentDate.setDate(currentDate.getDate() + 1)
    }

    // Calculate weekly totals
    const weeklyTotals = days.reduce((totals, day) => ({
      bookings: {
        count: totals.bookings.count + day.bookings.count,
        amount: totals.bookings.amount + day.bookings.amount
      },
      newVouchers: {
        count: totals.newVouchers.count + day.newVouchers.count,
        amount: totals.newVouchers.amount + day.newVouchers.amount
      },
      redeemedVouchers: {
        count: totals.redeemedVouchers.count + day.redeemedVouchers.count,
        amount: totals.redeemedVouchers.amount + day.redeemedVouchers.amount
      },
      newSubscriptions: {
        count: totals.newSubscriptions.count + day.newSubscriptions.count,
        amount: totals.newSubscriptions.amount + day.newSubscriptions.amount
      },
      redeemedSubscriptions: {
        count: totals.redeemedSubscriptions.count + day.redeemedSubscriptions.count,
        amount: totals.redeemedSubscriptions.amount + day.redeemedSubscriptions.amount
      },
      newCoupons: {
        count: totals.newCoupons.count + day.newCoupons.count,
        amount: totals.newCoupons.amount + day.newCoupons.amount
      },
      redeemedCoupons: {
        count: totals.redeemedCoupons.count + day.redeemedCoupons.count,
        amount: totals.redeemedCoupons.amount + day.redeemedCoupons.amount
      },
      newPartnerCoupons: {
        count: totals.newPartnerCoupons.count + day.newPartnerCoupons.count,
        amount: totals.newPartnerCoupons.amount + day.newPartnerCoupons.amount
      },
      redeemedPartnerCoupons: {
        count: totals.redeemedPartnerCoupons.count + day.redeemedPartnerCoupons.count,
        amount: totals.redeemedPartnerCoupons.amount + day.redeemedPartnerCoupons.amount
      },
      totalRevenue: totals.totalRevenue + day.totalRevenue,
      totalRedemptions: totals.totalRedemptions + day.totalRedemptions,
      professionalCosts: totals.professionalCosts + day.professionalCosts,
      officeProfit: totals.officeProfit + day.officeProfit
    }), {
      bookings: { count: 0, amount: 0 },
      newVouchers: { count: 0, amount: 0 },
      redeemedVouchers: { count: 0, amount: 0 },
      newSubscriptions: { count: 0, amount: 0 },
      redeemedSubscriptions: { count: 0, amount: 0 },
      newCoupons: { count: 0, amount: 0 },
      redeemedCoupons: { count: 0, amount: 0 },
      newPartnerCoupons: { count: 0, amount: 0 },
      redeemedPartnerCoupons: { count: 0, amount: 0 },
      totalRevenue: 0,
      totalRedemptions: 0,
      professionalCosts: 0,
      officeProfit: 0
    })

    const response: WeeklyTransactionData = {
      weekStart: start,
      weekEnd: end,
      days,
      weeklyTotals
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in weekly transactions API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 