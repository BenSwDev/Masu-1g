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

    // ✅ Get bookings data - paid bookings only
    const bookings = await db.collection('bookings').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['confirmed', 'completed'] },
      'paymentDetails.paymentStatus': 'paid'
    }).toArray()

    for (const booking of bookings) {
      const customer = booking.userId ? await db.collection('users').findOne({ _id: booking.userId }) : null
      const finalAmount = booking.priceDetails?.finalAmount || booking.totalAmount || 0
      const professionalCost = calculateProfessionalCosts(booking)
      
      transactions.push({
        id: booking._id.toString(),
        type: 'booking',
        time: booking.createdAt.toISOString(),
        customerName: customer?.name || booking.guestInfo?.name || booking.bookedByUserName,
        customerEmail: customer?.email || booking.guestInfo?.email || booking.bookedByUserEmail,
        customerPhone: customer?.phone || booking.guestInfo?.phone || booking.bookedByUserPhone,
        amount: finalAmount,
        professionalCost: professionalCost,
        description: `הזמנת טיפול: ${booking.treatmentName || 'לא צוין'}`,
        status: booking.status,
        paymentMethod: booking.paymentDetails?.method || 'לא צוין',
        transactionId: booking.paymentDetails?.transactionId || booking._id.toString()
      })

      summary.breakdown.bookings.count++
      summary.breakdown.bookings.amount += finalAmount
      summary.totalProfessionalCosts += professionalCost
    }

    // ✅ Get gift vouchers data - new purchases
    const newVouchers = await db.collection('gift-vouchers').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['active', 'pending_send', 'sent'] }
    }).toArray()

    for (const voucher of newVouchers) {
      const customer = voucher.purchaserUserId ? await db.collection('users').findOne({ _id: voucher.purchaserUserId }) : null
      const voucherAmount = voucher.amount || 0
      
      transactions.push({
        id: voucher._id.toString(),
        type: 'voucher_new',
        time: voucher.createdAt.toISOString(),
        customerName: customer?.name || voucher.guestInfo?.name,
        customerEmail: customer?.email || voucher.guestInfo?.email,
        customerPhone: customer?.phone || voucher.guestInfo?.phone,
        amount: voucherAmount,
        description: `רכישת שובר מתנה: ${voucher.voucherType === 'monetary' ? 'כספי' : 'טיפול'}`,
        status: voucher.status || 'active',
        transactionId: voucher.code || voucher._id.toString()
      })

      summary.breakdown.newVouchers.count++
      summary.breakdown.newVouchers.amount += voucherAmount
    }

    // ✅ Get redeemed vouchers data - bookings that used vouchers
    const voucherBookings = await db.collection('bookings').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      $or: [
        { 'priceDetails.appliedGiftVoucherId': { $exists: true, $ne: null } },
        { redeemedGiftVoucherId: { $exists: true, $ne: null } }
      ],
      status: { $in: ['confirmed', 'completed'] },
      'paymentDetails.paymentStatus': 'paid'
    }).toArray()

    for (const booking of voucherBookings) {
      const customer = booking.userId ? await db.collection('users').findOne({ _id: booking.userId }) : null
      const voucherAmount = booking.priceDetails?.voucherAppliedAmount || 0
      
      transactions.push({
        id: `${booking._id.toString()}_voucher_redeemed`,
        type: 'voucher_redeemed',
        time: booking.createdAt.toISOString(),
        customerName: customer?.name || booking.guestInfo?.name || booking.bookedByUserName,
        customerEmail: customer?.email || booking.guestInfo?.email || booking.bookedByUserEmail,
        customerPhone: customer?.phone || booking.guestInfo?.phone || booking.bookedByUserPhone,
        amount: -voucherAmount, // Negative because it's a discount
        description: `מימוש שובר מתנה בהזמנה`,
        status: 'redeemed',
        transactionId: booking.priceDetails?.appliedGiftVoucherId?.toString() || booking._id.toString()
      })

      summary.breakdown.redeemedVouchers.count++
      summary.breakdown.redeemedVouchers.amount += voucherAmount
    }

    // ✅ Get user subscriptions data - new purchases
    const newSubscriptions = await db.collection('user-subscriptions').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['active', 'expired', 'depleted'] } // Paid subscriptions
    }).toArray()

    for (const subscription of newSubscriptions) {
      const customer = subscription.userId ? await db.collection('users').findOne({ _id: subscription.userId }) : null
      const subscriptionDetails = await db.collection('subscriptions').findOne({ _id: subscription.subscriptionId })
      const paymentAmount = subscription.paymentAmount || 0
      
      transactions.push({
        id: subscription._id.toString(),
        type: 'subscription_new',
        time: subscription.createdAt.toISOString(),
        customerName: customer?.name || subscription.guestInfo?.name,
        customerEmail: customer?.email || subscription.guestInfo?.email,
        customerPhone: customer?.phone || subscription.guestInfo?.phone,
        amount: paymentAmount,
        description: `רכישת מנוי: ${subscriptionDetails?.name || 'לא צוין'}`,
        status: subscription.status || 'active',
        transactionId: subscription.paymentId || subscription._id.toString()
      })

      summary.breakdown.newSubscriptions.count++
      summary.breakdown.newSubscriptions.amount += paymentAmount
    }

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

    for (const booking of subscriptionBookings) {
      const customer = booking.userId ? await db.collection('users').findOne({ _id: booking.userId }) : null
      // The value of the treatment that was covered by subscription
      const treatmentValue = booking.priceDetails?.treatmentPriceAfterSubscriptionOrTreatmentVoucher || 0
      
      transactions.push({
        id: `${booking._id.toString()}_subscription_redeemed`,
        type: 'subscription_redeemed',
        time: booking.createdAt.toISOString(),
        customerName: customer?.name || booking.guestInfo?.name || booking.bookedByUserName,
        customerEmail: customer?.email || booking.guestInfo?.email || booking.bookedByUserEmail,
        customerPhone: customer?.phone || booking.guestInfo?.phone || booking.bookedByUserPhone,
        amount: -treatmentValue, // Negative because it's a discount
        description: `מימוש מנוי בהזמנה`,
        status: 'redeemed',
        transactionId: booking.priceDetails?.redeemedUserSubscriptionId?.toString() || booking._id.toString()
      })

      summary.breakdown.redeemedSubscriptions.count++
      summary.breakdown.redeemedSubscriptions.amount += treatmentValue
    }

    // ✅ Get coupons data - new coupons created
    const newCoupons = await db.collection('coupons').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      isActive: true
    }).toArray()

    for (const coupon of newCoupons) {
      const discountValue = coupon.discountValue || 0
      
      transactions.push({
        id: coupon._id.toString(),
        type: 'coupon_new',
        time: coupon.createdAt.toISOString(),
        amount: discountValue,
        description: `יצירת קופון: ${coupon.code} - ${coupon.description || 'ללא תיאור'}`,
        status: coupon.isActive ? 'active' : 'inactive',
        transactionId: coupon.code || coupon._id.toString()
      })

      summary.breakdown.newCoupons.count++
      summary.breakdown.newCoupons.amount += discountValue
    }

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

    for (const booking of couponBookings) {
      const customer = booking.userId ? await db.collection('users').findOne({ _id: booking.userId }) : null
      const discountAmount = booking.priceDetails?.discountAmount || 0
      
      transactions.push({
        id: `${booking._id.toString()}_coupon_redeemed`,
        type: 'coupon_redeemed',
        time: booking.createdAt.toISOString(),
        customerName: customer?.name || booking.guestInfo?.name || booking.bookedByUserName,
        customerEmail: customer?.email || booking.guestInfo?.email || booking.bookedByUserEmail,
        customerPhone: customer?.phone || booking.guestInfo?.phone || booking.bookedByUserPhone,
        amount: -discountAmount, // Negative because it's a discount
        description: `מימוש קופון בהזמנה`,
        status: 'redeemed',
        transactionId: booking.priceDetails?.appliedCouponId?.toString() || booking._id.toString()
      })

      summary.breakdown.redeemedCoupons.count++
      summary.breakdown.redeemedCoupons.amount += discountAmount
    }

    // ✅ Get partner coupon batches - new batches created
    const newPartnerCoupons = await db.collection('partner-coupon-batches').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      isActive: true
    }).toArray()

    for (const batch of newPartnerCoupons) {
      const totalValue = (batch.totalCoupons || 0) * (batch.discountValue || 0)
      
      transactions.push({
        id: batch._id.toString(),
        type: 'partner_coupon_new',
        time: batch.createdAt.toISOString(),
        amount: totalValue,
        description: `יצירת אצווה של קופוני שותפים: ${batch.totalCoupons} קופונים`,
        status: batch.isActive ? 'active' : 'inactive',
        transactionId: batch._id.toString()
      })

      summary.breakdown.newPartnerCoupons.count += batch.totalCoupons || 0
      summary.breakdown.newPartnerCoupons.amount += totalValue
    }

    // ✅ Get redeemed partner coupons - bookings that used partner coupons
    const partnerCouponBookings = await db.collection('bookings').find({
      createdAt: { $gte: dayStart, $lte: dayEnd },
      'appliedPartnerCouponId': { $exists: true, $ne: null },
      status: { $in: ['confirmed', 'completed'] },
      'paymentDetails.paymentStatus': 'paid'
    }).toArray()

    for (const booking of partnerCouponBookings) {
      const customer = booking.userId ? await db.collection('users').findOne({ _id: booking.userId }) : null
      const discountAmount = booking.partnerCouponDiscount || 0
      
      transactions.push({
        id: `${booking._id.toString()}_partner_coupon_redeemed`,
        type: 'partner_coupon_redeemed',
        time: booking.createdAt.toISOString(),
        customerName: customer?.name || booking.guestInfo?.name || booking.bookedByUserName,
        customerEmail: customer?.email || booking.guestInfo?.email || booking.bookedByUserEmail,
        customerPhone: customer?.phone || booking.guestInfo?.phone || booking.bookedByUserPhone,
        amount: -discountAmount, // Negative because it's a discount
        description: `מימוש קופון שותף בהזמנה`,
        status: 'redeemed',
        transactionId: booking.appliedPartnerCouponId?.toString() || booking._id.toString()
      })

      summary.breakdown.redeemedPartnerCoupons.count++
      summary.breakdown.redeemedPartnerCoupons.amount += discountAmount
    }

    // Sort transactions by time (newest first)
    transactions.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

    // ✅ Calculate summary totals
    summary.totalTransactions = transactions.length
    
    // Revenue = actual money received
    summary.totalRevenue = 
      summary.breakdown.bookings.amount + 
      summary.breakdown.newVouchers.amount + 
      summary.breakdown.newSubscriptions.amount

    // Redemptions = value of discounts/vouchers used (money NOT received)
    summary.totalRedemptions = 
      summary.breakdown.redeemedVouchers.amount + 
      summary.breakdown.redeemedSubscriptions.amount + 
      summary.breakdown.redeemedCoupons.amount + 
      summary.breakdown.redeemedPartnerCoupons.amount

    // Office profit = revenue - professional costs
    summary.totalOfficeProfit = summary.totalRevenue - summary.totalProfessionalCosts

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