import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles?.includes("professional")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const professionalId = session.user.id
    const { searchParams } = new URL(request.url)
    
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const dateRange = searchParams.get("dateRange") || ""
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    await dbConnect()

    // Build query for professional's bookings only
    const query: any = {
      professionalId: new mongoose.Types.ObjectId(professionalId)
    }

    // Add search filter
    if (search) {
      query.$or = [
        { bookingNumber: { $regex: search, $options: "i" } },
        { bookedByUserName: { $regex: search, $options: "i" } },
        { recipientName: { $regex: search, $options: "i" } }
      ]
    }

    // Add status filter
    if (status && status !== "all") {
      query.status = status
    }

    // Add date range filter
    if (dateRange && dateRange !== "all") {
      const now = new Date()
      let startDate: Date
      
      switch (dateRange) {
        case "today":
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          query.bookingDateTime = { $gte: startDate }
          break
        case "week":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          query.bookingDateTime = { $gte: startDate }
          break
        case "month":
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          query.bookingDateTime = { $gte: startDate }
          break
        case "upcoming":
          query.bookingDateTime = { $gte: now }
          query.status = { $in: ["confirmed", "on_way"] }
          break
      }
    }

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalBookings / limit)

    // Get bookings with necessary population (but hide customer payment info)
    const bookings = await Booking.find(query)
      .populate("treatmentId", "name category durations defaultDurationMinutes")
      .populate("userId", "name phone") // Only basic user info, no financial data
      .select(`
        bookingNumber bookedByUserName bookedByUserPhone recipientName recipientPhone
        treatmentId selectedDurationId bookingDateTime status notes
        bookingAddressSnapshot customAddressDetails
        priceDetails.totalProfessionalPayment priceDetails.baseProfessionalPayment priceDetails.surchargesProfessionalPayment
        professionalId createdAt updatedAt
      `) // Explicitly select only safe fields
      .sort({ bookingDateTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Calculate summary statistics
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const [summaryData] = await Promise.all([
      Booking.aggregate([
        { $match: { professionalId: new mongoose.Types.ObjectId(professionalId) } },
        {
          $group: {
            _id: null,
            totalBookings: { $sum: 1 },
            activeBookings: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["confirmed", "on_way", "in_treatment"]] },
                  1,
                  0
                ]
              }
            },
            monthlyEarnings: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$bookingDateTime", startOfMonth] },
                      { $eq: ["$status", "completed"] }
                    ]
                  },
                  "$priceDetails.totalProfessionalPayment",
                  0
                ]
              }
            },
            pendingEarnings: {
              $sum: {
                $cond: [
                  { $in: ["$status", ["confirmed", "on_way", "in_treatment"]] },
                  "$priceDetails.totalProfessionalPayment",
                  0
                ]
              }
            }
          }
        }
      ])
    ])

    const summary = summaryData[0] || {
      totalBookings: 0,
      activeBookings: 0,
      monthlyEarnings: 0,
      pendingEarnings: 0
    }

    logger.info("Professional bookings fetched", {
      professionalId,
      totalBookings,
      currentPage: page,
      filters: { search, status, dateRange }
    })

    return NextResponse.json({
      success: true,
      bookings: JSON.parse(JSON.stringify(bookings)),
      totalPages,
      totalBookings,
      currentPage: page,
      summary
    })

  } catch (error) {
    logger.error("Error fetching professional bookings:", error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookings" },
      { status: 500 }
    )
  }
} 