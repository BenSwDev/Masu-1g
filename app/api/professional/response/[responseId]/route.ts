import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import { verifyProfessionalToken } from "@/lib/auth/jwt-auth"

/**
 * GET /api/professional/response/[responseId]
 * Get professional response and booking details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    await dbConnect()

    const { responseId } = await params

    if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
      return NextResponse.json(
        { success: false, error: "מזהה תגובה לא תקין" },
        { status: 400 }
      )
    }

    // Verify JWT token
    const tokenData = verifyProfessionalToken(request)
    if (!tokenData || tokenData.responseId !== responseId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Import models dynamically to avoid circular dependency issues
    const { default: ProfessionalResponse } = await import("@/lib/db/models/professional-response") as any
    const { default: Booking } = await import("@/lib/db/models/booking") as any
    const { default: User } = await import("@/lib/db/models/user") as any

    // Get response with related data
    const response = await ProfessionalResponse.findById(responseId)
      .populate({
        path: 'professionalId',
        select: 'name email phone'
      })
      .populate({
        path: 'bookingId',
        select: 'bookingNumber treatmentId bookingDateTime bookingAddressSnapshot status priceDetails notes professionalId',
        populate: {
          path: 'treatmentId',
          select: 'name'
        }
      })
      .lean()

    if (!response) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה תגובה" },
        { status: 404 }
      )
    }

    const booking = response.bookingId as any
    const professional = response.professionalId as any

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה הזמנה" },
        { status: 404 }
      )
    }

    // Check if this professional can still respond or interact with the booking
    // They can respond/interact if:
    // 1. Their response is still pending (for accept/decline actions)
    // 2. OR their response is accepted AND the booking is assigned to them (for status updates)
    // 3. The booking is in an appropriate status
    const canRespond = (
      (response.status === "pending" && (!booking.professionalId || booking.professionalId.toString() === professional._id.toString())) ||
      (response.status === "accepted" && booking.professionalId && booking.professionalId.toString() === professional._id.toString())
    ) && ["pending_professional", "confirmed", "on_way", "in_treatment"].includes(booking.status)

    // Calculate expected professional payment
    let expectedPayment = {
      basePayment: 0,
      surcharges: 0,
      paymentBonus: 0,
      total: 0,
      breakdown: [] as Array<{ description: string; amount: number }>
    }

    try {
      // Get professional profile to calculate accurate payment
      const { default: ProfessionalProfile } = await import("@/lib/db/models/professional-profile")
      const professionalProfile = await ProfessionalProfile.findOne({ userId: professional._id }).lean()
      
      if (professionalProfile) {
        const { calculateProfessionalPaymentForBooking } = await import("@/lib/utils/professional-payment-utils")
        const paymentCalc = calculateProfessionalPaymentForBooking(booking, professionalProfile)
        
        expectedPayment.basePayment = paymentCalc.baseProfessionalPayment
        expectedPayment.surcharges = paymentCalc.surchargesProfessionalPayment
        expectedPayment.breakdown.push({
          description: "תשלום בסיס",
          amount: paymentCalc.baseProfessionalPayment
        })
        
        if (paymentCalc.surchargesProfessionalPayment > 0) {
          expectedPayment.breakdown.push({
            description: "תוספות שעות",
            amount: paymentCalc.surchargesProfessionalPayment
          })
        }
      } else {
        // Fallback to booking's calculated payment
        expectedPayment.basePayment = booking.priceDetails?.baseProfessionalPayment || 0
        expectedPayment.surcharges = booking.priceDetails?.surchargesProfessionalPayment || 0
        expectedPayment.breakdown.push({
          description: "תשלום בסיס",
          amount: expectedPayment.basePayment
        })
        
        if (expectedPayment.surcharges > 0) {
          expectedPayment.breakdown.push({
            description: "תוספות שעות", 
            amount: expectedPayment.surcharges
          })
        }
      }
      
      // Add payment bonus if exists
      if (booking.priceDetails?.paymentBonus) {
        expectedPayment.paymentBonus = booking.priceDetails.paymentBonus.amount
        expectedPayment.breakdown.push({
          description: booking.priceDetails.paymentBonus.description || "תוספת תשלום מיוחדת",
          amount: booking.priceDetails.paymentBonus.amount
        })
      }
      
      expectedPayment.total = expectedPayment.basePayment + expectedPayment.surcharges + expectedPayment.paymentBonus
      
    } catch (error) {
      logger.warn("Failed to calculate expected payment for professional response", { 
        error, 
        responseId, 
        professionalId: professional._id 
      })
    }

    const responseData = {
      _id: response._id,
      status: response.status,
      booking: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        treatmentName: booking.treatmentId?.name || "טיפול",
        bookingDateTime: booking.bookingDateTime,
        address: {
          city: booking.bookingAddressSnapshot?.city || "",
          street: booking.bookingAddressSnapshot?.street || "",
          streetNumber: booking.bookingAddressSnapshot?.streetNumber || ""
        },
        status: booking.status,
        notes: booking.notes
      },
      professionalName: professional.name,
      professionalPhone: response.phoneNumber || professional.phone || "",
      canRespond,
      bookingCurrentStatus: booking.status,
      isAdminAssigned: response.responseMethod === "admin_assignment",
      responseMethod: response.responseMethod,
      expectedPayment
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    logger.error("Error in professional response GET:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 