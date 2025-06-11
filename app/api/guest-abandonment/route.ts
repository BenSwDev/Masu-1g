import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import Booking from "@/lib/db/models/booking"
import { logger } from "@/lib/logs/logger"

export async function POST(request: NextRequest) {
  try {
    const abandonmentData = await request.json()
    
    await dbConnect()

    // Create abandoned booking record
    const abandonedBooking = new Booking({
      // User info
      userId: abandonmentData.guestUserId,
      
      // Basic booking info (will be minimal for abandoned bookings)
      status: "abandoned",
      source: "new_purchase",
      isGuestBooking: true,
      
      // Abandonment details in notes
      notes: JSON.stringify({
        abandonmentReason: abandonmentData.abandonmentReason,
        abandonmentTime: abandonmentData.abandonmentTime,
        timeSpentInModal: `${Math.round(abandonmentData.timeSpentInModal / 1000)} seconds`,
        lastInteractionTime: abandonmentData.lastInteractionTime,
        purchaseType: abandonmentData.purchaseType,
        currentStep: abandonmentData.currentStep,
        formData: abandonmentData.formData,
        userAgent: request.headers.get('user-agent'),
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        timestamp: new Date().toISOString()
      }, null, 2),
      
      // Minimal required fields (will be null/default for abandoned bookings)
      selectedTreatmentId: null,
      selectedDurationId: null,
      professionalId: null,
      selectedDate: new Date(), // dummy date
      selectedTimeSlot: "00:00",
      priceDetails: {
        basePrice: 0,
        finalAmount: 0,
        surcharges: [],
        discountAmount: 0,
        voucherAppliedAmount: 0,
        isBaseTreatmentCoveredBySubscription: false,
        isBaseTreatmentCoveredByTreatmentVoucher: false,
        isFullyCoveredByVoucherOrSubscription: false
      },
      
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await abandonedBooking.save()

    // Log the abandonment for monitoring
    logger.info(`Guest abandonment tracked: ${abandonmentData.guestUserId || 'unknown'} - ${abandonmentData.abandonmentReason}`, {
      guestUserId: abandonmentData.guestUserId,
      abandonmentReason: abandonmentData.abandonmentReason,
      purchaseType: abandonmentData.purchaseType,
      currentStep: abandonmentData.currentStep,
      timeSpent: abandonmentData.timeSpentInModal,
      bookingId: abandonedBooking._id.toString()
    })

    return NextResponse.json({ 
      success: true, 
      message: "Abandonment tracked",
      bookingId: abandonedBooking._id.toString()
    })

  } catch (error) {
    logger.error("Error tracking guest abandonment:", error)
    
    // Still return success to not interfere with user experience
    return NextResponse.json({ 
      success: true, 
      message: "Abandonment tracking failed but not critical" 
    })
  }
} 