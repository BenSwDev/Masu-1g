import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import dbConnect from '@/lib/db/mongoose'
import Booking from '@/lib/db/models/booking'
import Treatment from '@/lib/db/models/treatment'
import User from '@/lib/db/models/user'
import { logger } from '@/lib/logs/logger'
import mongoose from 'mongoose'
import type { PopulatedBooking } from '@/types/booking'

// GET /api/bookings - Get user bookings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'User ID required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    if (!session || session.user.id !== userId) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    // Extract filters
    const filters = {
      status: searchParams.get('status') || undefined,
      treatment: searchParams.get('treatment') || undefined,
      dateRange: searchParams.get('dateRange') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') || 'bookingDateTime',
      sortDirection: (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc'
    }

    const query: any = { userId: new mongoose.Types.ObjectId(userId) }

    // Apply filters
    if (filters.status && filters.status !== "all") {
      switch (filters.status) {
        case "upcoming":
          query.status = { $in: ["in_process", "confirmed"] }
          query.bookingDateTime = { $gte: new Date() }
          break
        case "past":
          query.status = { $in: ["completed"] }
          break
        case "cancelled":
          query.status = { $in: ["cancelled", "refunded"] }
          break
        default:
          query.status = filters.status
          break
      }
    }

    if (filters.treatment && filters.treatment !== "all") {
      query.treatmentId = new mongoose.Types.ObjectId(filters.treatment)
    }

    if (filters.dateRange && filters.dateRange !== "all") {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (filters.dateRange) {
        case "today":
          query.bookingDateTime = {
            $gte: today,
            $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
          }
          break
        case "this_week":
          const startOfWeek = new Date(today)
          startOfWeek.setDate(today.getDate() - today.getDay())
          const endOfWeek = new Date(startOfWeek)
          endOfWeek.setDate(startOfWeek.getDate() + 7)
          query.bookingDateTime = { $gte: startOfWeek, $lt: endOfWeek }
          break
        case "this_month":
          const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
          query.bookingDateTime = { $gte: startOfMonth, $lt: endOfMonth }
          break
        case "last_month":
          const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
          const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 1)
          query.bookingDateTime = { $gte: startOfLastMonth, $lt: endOfLastMonth }
          break
      }
    }

    if (filters.search && filters.search.trim()) {
      query.$or = [
        { bookingNumber: { $regex: filters.search.trim(), $options: "i" } },
        { recipientName: { $regex: filters.search.trim(), $options: "i" } },
        { notes: { $regex: filters.search.trim(), $options: "i" } }
      ]
    }

    const sortOptions: { [key: string]: 1 | -1 } = {}
    sortOptions[filters.sortBy] = filters.sortDirection === "asc" ? 1 : -1

    const totalBookings = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalBookings / filters.limit)

    const rawBookings = await Booking.find(query)
      .populate('treatmentId', 'name durations defaultDurationMinutes pricingType fixedPrice isActive')
      .populate('addressId', 'fullAddress city street streetNumber apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes addressType')
      .populate('professionalId', 'name')
      .populate('priceDetails.appliedCouponId')
      .populate('priceDetails.appliedGiftVoucherId')
      .populate({
        path: 'priceDetails.redeemedUserSubscriptionId',
        populate: [
          { path: 'subscriptionId', select: 'name description' },
          { path: 'treatmentId', select: 'name pricingType defaultDurationMinutes durations' }
        ]
      })
      .populate('paymentDetails.paymentMethodId', 'type last4 brand isDefault displayName')
      .sort(sortOptions)
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .lean()

    const bookings = rawBookings as unknown as PopulatedBooking[]

    return NextResponse.json({ 
      success: true, 
      bookings, 
      totalPages, 
      totalBookings 
    })

  } catch (error) {
    logger.error('Error fetching user bookings:', { error })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch bookings' 
    }, { status: 500 })
  }
} 