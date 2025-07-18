import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth/require-admin-session"
import { connectDB } from "@/lib/db/mongodb"
import { ObjectId } from "mongodb"

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

// Helper function to calculate professional costs from booking
function calculateProfessionalCosts(booking: any): number {
  // Use the new financial breakdown if available
  if (booking.priceDetails?.totalProfessionalPayment) {
    return booking.priceDetails.totalProfessionalPayment
  }
  
  // Fallback to legacy fields
  if (booking.staticTherapistPay) {
    return booking.staticTherapistPay
  }
  
  // Default calculation if no specific data
  const finalAmount = booking.priceDetails?.finalAmount || booking.totalAmount || 0
  // Assume 70% goes to professional as default
  return Math.round(finalAmount * 0.7)
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

    const client = await connectDB()
    const db = client.db()
    
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
        // ✅ Get bookings data - paid bookings from CARDCOM payments
        const payments = await db.collection('payments').find({
          start_time: { $gte: dayStart, $lte: dayEnd },
          complete: true,
          booking_id: { $exists: true, $ne: null }
        }).toArray()

        // Get corresponding bookings
        const bookingIds = payments.map(p => p.booking_id).filter(Boolean)
        const bookings = bookingIds.length > 0 ? await db.collection('bookings').find({
          _id: { $in: bookingIds.map(id => new ObjectId(id)) }
        }).toArray() : []

        dayData.bookings.count = payments.length
        dayData.bookings.amount = payments.reduce((sum, payment) => {
          return sum + (payment.sum || 0)
        }, 0)

        // Calculate professional costs for bookings
        dayData.professionalCosts = bookings.reduce((sum, booking) => {
          return sum + calculateProfessionalCosts(booking)
        }, 0)

        // ✅ Get gift vouchers data - new purchases with payments
        const voucherPayments = await db.collection('payments').find({
          start_time: { $gte: dayStart, $lte: dayEnd },
          complete: true,
          'input_data.type': 'gift_voucher'
        }).toArray()

        dayData.newVouchers.count = voucherPayments.length
        dayData.newVouchers.amount = voucherPayments.reduce((sum, payment) => {
          return sum + (payment.sum || 0)
        }, 0)

        // ✅ Get redeemed vouchers - bookings that used vouchers
        const voucherBookings = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          $or: [
            { 'priceDetails.appliedGiftVoucherId': { $exists: true, $ne: null } },
            { redeemedGiftVoucherId: { $exists: true, $ne: null } }
          ],
          status: { $in: ['confirmed', 'completed'] },
          'paymentDetails.paymentStatus': 'paid'
        }).toArray()

        dayData.redeemedVouchers.count = voucherBookings.length
        dayData.redeemedVouchers.amount = voucherBookings.reduce((sum, booking) => {
          return sum + (booking.priceDetails?.voucherAppliedAmount || 0)
        }, 0)

        // ✅ Get user subscriptions data - new purchases with payments
        const subscriptionPayments = await db.collection('payments').find({
          start_time: { $gte: dayStart, $lte: dayEnd },
          complete: true,
          'input_data.type': 'subscription'
        }).toArray()

        dayData.newSubscriptions.count = subscriptionPayments.length
        dayData.newSubscriptions.amount = subscriptionPayments.reduce((sum, payment) => {
          return sum + (payment.sum || 0)
        }, 0)

        // ✅ Get redeemed subscriptions - bookings that used subscriptions
        const subscriptionBookings = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          $or: [
            { 'priceDetails.redeemedUserSubscriptionId': { $exists: true, $ne: null } },
            { redeemedUserSubscriptionId: { $exists: true, $ne: null } }
          ],
          status: { $in: ['confirmed', 'completed'] },
          'paymentDetails.paymentStatus': 'paid'
        }).toArray()

        dayData.redeemedSubscriptions.count = subscriptionBookings.length
        // For redeemed subscriptions, we count the original treatment value that was "used"
        dayData.redeemedSubscriptions.amount = subscriptionBookings.reduce((sum, booking) => {
          // The value of the treatment that was covered by subscription
          const treatmentValue = booking.priceDetails?.treatmentPriceAfterSubscriptionOrTreatmentVoucher || 0
          return sum + treatmentValue
        }, 0)

        // ✅ Get coupons data - new coupons created
        const newCoupons = await db.collection('coupons').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          isActive: true
        }).toArray()

        dayData.newCoupons.count = newCoupons.length
        // For coupons, we track potential value (not actual revenue)
        dayData.newCoupons.amount = newCoupons.reduce((sum, coupon) => {
          return sum + (coupon.discountValue || 0)
        }, 0)

        // ✅ Get redeemed coupons - bookings that used coupons
        const couponBookings = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          $or: [
            { 'priceDetails.appliedCouponId': { $exists: true, $ne: null } },
            { appliedCouponId: { $exists: true, $ne: null } }
          ],
          status: { $in: ['confirmed', 'completed'] },
          'paymentDetails.paymentStatus': 'paid'
        }).toArray()

        dayData.redeemedCoupons.count = couponBookings.length
        dayData.redeemedCoupons.amount = couponBookings.reduce((sum, booking) => {
          return sum + (booking.priceDetails?.discountAmount || 0)
        }, 0)

        // ✅ Get partner coupon batches - new batches created
        const newPartnerCoupons = await db.collection('partner-coupon-batches').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          isActive: true
        }).toArray()

        dayData.newPartnerCoupons.count = newPartnerCoupons.reduce((sum, batch) => {
          return sum + (batch.totalCoupons || 0)
        }, 0)
        dayData.newPartnerCoupons.amount = newPartnerCoupons.reduce((sum, batch) => {
          return sum + ((batch.totalCoupons || 0) * (batch.discountValue || 0))
        }, 0)

        // ✅ Get redeemed partner coupons - bookings that used partner coupons
        const partnerCouponBookings = await db.collection('bookings').find({
          createdAt: { $gte: dayStart, $lte: dayEnd },
          'appliedPartnerCouponId': { $exists: true, $ne: null },
          status: { $in: ['confirmed', 'completed'] },
          'paymentDetails.paymentStatus': 'paid'
        }).toArray()

        dayData.redeemedPartnerCoupons.count = partnerCouponBookings.length
        dayData.redeemedPartnerCoupons.amount = partnerCouponBookings.reduce((sum, booking) => {
          // Partner coupon discount should be in priceDetails or a specific field
          return sum + (booking.partnerCouponDiscount || 0)
        }, 0)

        // ✅ Calculate correct totals
        // Revenue = actual money received
        dayData.totalRevenue = 
          dayData.bookings.amount + 
          dayData.newVouchers.amount + 
          dayData.newSubscriptions.amount

        // Redemptions = value of discounts/vouchers used (money NOT received)
        dayData.totalRedemptions = 
          dayData.redeemedVouchers.amount + 
          dayData.redeemedSubscriptions.amount + 
          dayData.redeemedCoupons.amount + 
          dayData.redeemedPartnerCoupons.amount

        // Office profit = revenue - professional costs
        dayData.officeProfit = dayData.totalRevenue - dayData.professionalCosts

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