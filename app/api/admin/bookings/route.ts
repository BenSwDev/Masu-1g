import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import dbConnect from '@/lib/db/mongoose'
import Booking from '@/lib/db/models/booking'
import { logger } from '@/lib/logs/logger'
import mongoose from 'mongoose'
import type { PopulatedBooking } from '@/types/booking'

// GET /api/admin/bookings - Get all bookings (admin only)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    await dbConnect()

    const { searchParams } = new URL(request.url)

    // Extract filters
    const filters = {
      status: searchParams.get('status') || undefined,
      professional: searchParams.get('professional') || undefined,
      treatment: searchParams.get('treatment') || undefined,
      dateRange: searchParams.get('dateRange') || undefined,
      priceRange: searchParams.get('priceRange') || undefined,
      address: searchParams.get('address') || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortDirection: (searchParams.get('sortDirection') || 'desc') as 'asc' | 'desc'
    }

    logger.info("Admin getAllBookings called with filters:", filters)

    const filterQuery: any = {}

    // Apply filters
    if (filters.status && filters.status !== "all") {
      filterQuery.status = filters.status
    }

    if (filters.professional && filters.professional !== "all") {
      if (filters.professional === "assigned") {
        filterQuery.professionalId = { $ne: null }
      } else if (filters.professional === "unassigned") {
        filterQuery.professionalId = null
      } else {
        filterQuery.professionalId = new mongoose.Types.ObjectId(filters.professional)
      }
    }

    if (filters.treatment && filters.treatment !== "all") {
      filterQuery.treatmentId = new mongoose.Types.ObjectId(filters.treatment)
    }

    if (filters.dateRange && filters.dateRange !== "all") {
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      
      switch (filters.dateRange) {
        case "today":
          filterQuery.bookingDateTime = {
            $gte: startOfDay,
            $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
          }
          break
        case "tomorrow":
          const tomorrowStart = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)
          const tomorrowEnd = new Date(tomorrowStart.getTime() + 24 * 60 * 60 * 1000)
          filterQuery.bookingDateTime = {
            $gte: tomorrowStart,
            $lt: tomorrowEnd
          }
          break
        case "this_week":
          const thisWeekStart = new Date(startOfDay.getTime() - startOfDay.getDay() * 24 * 60 * 60 * 1000)
          const thisWeekEnd = new Date(thisWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          filterQuery.bookingDateTime = {
            $gte: thisWeekStart,
            $lt: thisWeekEnd
          }
          break
        case "next_week":
          const nextWeekStart = new Date(startOfDay.getTime() + (7 - startOfDay.getDay()) * 24 * 60 * 60 * 1000)
          const nextWeekEnd = new Date(nextWeekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          filterQuery.bookingDateTime = {
            $gte: nextWeekStart,
            $lt: nextWeekEnd
          }
          break
        case "this_month":
          const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
          const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          filterQuery.bookingDateTime = {
            $gte: thisMonthStart,
            $lt: thisMonthEnd
          }
          break
        case "next_month":
          const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1)
          const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1)
          filterQuery.bookingDateTime = {
            $gte: nextMonthStart,
            $lt: nextMonthEnd
          }
          break
      }
    }

    if (filters.priceRange && filters.priceRange !== "all") {
      const [min, max] = filters.priceRange.includes("-") 
        ? filters.priceRange.split("-").map(Number)
        : filters.priceRange === "500+" 
          ? [500, Infinity]
          : [0, 0]
      
      if (max === Infinity) {
        filterQuery["priceDetails.finalAmount"] = { $gte: min }
      } else {
        filterQuery["priceDetails.finalAmount"] = { $gte: min, $lt: max }
      }
    }

    if (filters.search && filters.search.trim()) {
      const searchRegex = new RegExp(filters.search.trim(), "i")
      filterQuery.$or = [
        { bookingNumber: searchRegex },
        { bookedByUserName: searchRegex },
        { bookedByUserEmail: searchRegex },
        { bookedByUserPhone: searchRegex },
        { recipientName: searchRegex },
        { recipientPhone: searchRegex },
      ]
    }

    // Calculate pagination
    const skip = (filters.page - 1) * filters.limit
    const sortOrder = filters.sortDirection === "asc" ? 1 : -1

    // Get total count
    const totalBookings = await Booking.countDocuments(filterQuery)
    const totalPages = Math.ceil(totalBookings / filters.limit)

    // Fetch bookings with population
    const bookings = await Booking.find(filterQuery)
      .sort({ [filters.sortBy]: sortOrder })
      .skip(skip)
      .limit(filters.limit)
      .populate("userId", "name email phone dateOfBirth gender roles activeRole treatmentPreferences notificationPreferences createdAt updatedAt")
      .populate("professionalId", "name email phone specialization")
      .populate("treatmentId", "name category defaultDurationMinutes pricingType fixedPrice durations")
      .populate("addressId", "fullAddress city street streetNumber apartmentDetails houseDetails officeDetails hotelDetails otherDetails additionalNotes addressType hasPrivateParking")
      .populate("priceDetails.appliedCouponId", "code discountType discountValue")
      .populate("priceDetails.appliedGiftVoucherId", "code amount")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .populate("paymentDetails.paymentMethodId", "type last4 brand displayName")
      .lean()

    const populatedBookings: PopulatedBooking[] = bookings.map((booking) => ({
      ...booking,
      _id: booking._id,
      userId: booking.userId,
      treatmentId: booking.treatmentId,
      professionalId: booking.professionalId || null,
      addressId: booking.addressId || null,
    }))

    return NextResponse.json({
      success: true,
      bookings: populatedBookings,
      totalPages,
      totalBookings,
    })

  } catch (error) {
    logger.error("Error in admin getAllBookings:", { error })
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch bookings' 
    }, { status: 500 })
  }
} 