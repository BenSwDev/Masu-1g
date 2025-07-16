import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"

/**
 * POST /api/professional/response/[responseId]/verify-phone
 * Verify professional's phone number and create JWT token
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ responseId: string }> }
) {
  try {
    await dbConnect()

    const { responseId } = await params
    const { phoneNumber } = await request.json()

    if (!responseId || !mongoose.Types.ObjectId.isValid(responseId)) {
      return NextResponse.json(
        { success: false, error: "מזהה תגובה לא תקין" },
        { status: 400 }
      )
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json(
        { success: false, error: "נא להכניס מספר טלפון" },
        { status: 400 }
      )
    }

    // Import models
    const ProfessionalResponse = (await import("@/lib/db/models/professional-response")).default

    // Get response
    const response = await (ProfessionalResponse.findById as any)(responseId)
      .populate('professionalId', 'name phone')
      .populate('bookingId', 'bookingNumber')

    if (!response) {
      return NextResponse.json(
        { success: false, error: "לא נמצאה תגובה" },
        { status: 404 }
      )
    }

    const professional = response.professionalId as any
    const booking = response.bookingId as any

    // Normalize phone numbers for comparison
    const normalizePhone = (phone: string) => {
      return phone.replace(/[-\s]/g, '').replace(/^\+972/, '0')
    }

    const inputPhone = normalizePhone(phoneNumber.trim())
    const professionalPhone = normalizePhone(response.phoneNumber || professional.phone || '')

    // Check if phone numbers match
    if (inputPhone !== professionalPhone) {
      logger.warn("Phone verification failed", {
        responseId,
        inputPhone,
        professionalPhone: professionalPhone.replace(/./g, '*'), // Log with asterisks for security
        professionalId: professional._id
      })
      
      return NextResponse.json(
        { success: false, error: "מספר הטלפון לא תואם למספר הרשום במערכת" },
        { status: 400 }
      )
    }

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || 'fallback-secret'
    const token = jwt.sign(
      {
        responseId,
        professionalId: professional._id.toString(),
        bookingId: booking._id.toString(),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      },
      jwtSecret
    )

    logger.info("Professional phone verified successfully", {
      responseId,
      professionalId: professional._id,
      professionalName: professional.name,
      bookingId: booking._id
    })

    return NextResponse.json({
      success: true,
      token,
      message: "זהות אומתה בהצלחה"
    })

  } catch (error) {
    logger.error("Error in professional phone verification:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 