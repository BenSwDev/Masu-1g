import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/auth/require-admin-session"
import { connectDB } from "@/lib/db/mongodb"

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    await requireAdminSession()

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
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    const client = await connectDB()
    const db = client.db()

    const bookingsAgg = await db.collection('bookings').aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'completed'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$totalAmount', 0] } }
        }
      }
    ]).toArray()
    const bookingsTotal = bookingsAgg[0]?.total || 0

    const vouchersAgg = await db.collection('gift-vouchers').aggregate([
      {
        $match: { createdAt: { $gte: startDate, $lte: endDate } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$monetaryValue', '$treatmentValue'] } }
        }
      }
    ]).toArray()
    const vouchersTotal = vouchersAgg[0]?.total || 0

    const subscriptionsAgg = await db.collection('user-subscriptions').aggregate([
      {
        $match: { createdAt: { $gte: startDate, $lte: endDate } }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $ifNull: ['$amount', 0] } }
        }
      }
    ]).toArray()
    const subscriptionsTotal = subscriptionsAgg[0]?.total || 0

    const total = bookingsTotal + vouchersTotal + subscriptionsTotal

    return NextResponse.json({
      success: true,
      totals: {
        bookings: bookingsTotal,
        voucherPurchases: vouchersTotal,
        subscriptionPurchases: subscriptionsTotal,
        totalRevenue: total
      }
    })
  } catch (error) {
    console.error('Error fetching revenue summary:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
