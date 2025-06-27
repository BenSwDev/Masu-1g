import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { Booking } from "@/lib/db/models/booking"
import { UserSubscription } from "@/lib/db/models/user-subscription"
import { GiftVoucher } from "@/lib/db/models/gift-voucher"
import { findSuitableProfessionals } from "@/actions/booking-actions"
import mongoose from "mongoose"
import { logger } from "@/lib/logs/logger"
import { bookingLogger } from "@/lib/logs/booking-logger"
import { revalidatePath } from "next/cache"

interface PaymentStatusRequest {
  paymentStatus: "success" | "failed"
  transactionId?: string
}

// Rollback function for failed payments
async function rollbackBookingRedemptions(booking: any, session: any): Promise<void> {
  logger.info("Rolling back booking redemptions due to payment failure", { 
    bookingId: booking._id.toString() 
  })

  // Rollback subscription redemption
  if (booking.priceDetails.redeemedUserSubscriptionId && booking.priceDetails.isBaseTreatmentCoveredBySubscription) {
    const userSub = await UserSubscription.findById(booking.priceDetails.redeemedUserSubscriptionId).session(session)
    if (userSub) {
      userSub.remainingQuantity += 1
      if (userSub.status === "depleted") userSub.status = "active"
      await userSub.save({ session })
      logger.info("Rolled back subscription redemption", { 
        subscriptionId: userSub._id, 
        newQuantity: userSub.remainingQuantity 
      })
    }
  }

  // Rollback gift voucher redemption
  if (booking.priceDetails.appliedGiftVoucherId && booking.priceDetails.voucherAppliedAmount > 0) {
    const voucher = await GiftVoucher.findById(booking.priceDetails.appliedGiftVoucherId).session(session)
    if (voucher) {
      if (voucher.voucherType === "monetary") {
        voucher.currentBalance += booking.priceDetails.voucherAppliedAmount
        voucher.status = "active"
      } else if (voucher.voucherType === "treatment") {
        voucher.isUsed = false
        voucher.usageDate = undefined
        voucher.status = "active"
      }
      await voucher.save({ session })
      logger.info("Rolled back gift voucher redemption", { 
        voucherId: voucher._id, 
        type: voucher.voucherType,
        rollbackAmount: voucher.voucherType === "monetary" ? booking.priceDetails.voucherAppliedAmount : null
      })
    }
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  const mongooseDbSession = await mongoose.startSession()
  
  try {
    await dbConnect()
    
    const resolvedParams = await params
    const { bookingId } = resolvedParams
    const body: PaymentStatusRequest = await request.json()
    const { paymentStatus, transactionId } = body

    if (!bookingId || !paymentStatus) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters" },
        { status: 400 }
      )
    }

    if (!["success", "failed"].includes(paymentStatus)) {
      return NextResponse.json(
        { success: false, error: "Invalid payment status" },
        { status: 400 }
      )
    }

    let updatedBooking: any = null

    await mongooseDbSession.withTransaction(async () => {
      bookingLogger.logPayment({
        bookingId,
        paymentStatus,
        metadata: { transactionId }
      }, `Processing payment ${paymentStatus} for booking`)
      
      const booking = await Booking.findById(bookingId).session(mongooseDbSession)
      if (!booking) {
        bookingLogger.logError({ bookingId }, "Booking not found", "Payment processing failed - booking not found")
        throw new Error("Booking not found")
      }

      if (paymentStatus === "success") {
        // Payment successful - update status to paid
        booking.paymentDetails.paymentStatus = "paid"
        booking.paymentDetails.transactionId = transactionId
        booking.status = "in_process" // Now in process - paid but not assigned professional
        
        // Find suitable professionals and save to booking
        const suitableProfessionalsResult = await findSuitableProfessionals(bookingId)
        
        if (suitableProfessionalsResult.success && suitableProfessionalsResult.professionals) {
          // Save suitable professionals list to booking
          booking.suitableProfessionals = suitableProfessionalsResult.professionals.map((prof: any) => ({
            professionalId: prof.userId._id,
            name: prof.userId.name,
            email: prof.userId.email,
            phone: prof.userId.phone,
            gender: prof.userId.gender,
            profileId: prof._id,
            calculatedAt: new Date()
          }))
          
          logger.info("Saved suitable professionals to booking", { 
            bookingId, 
            professionalCount: booking.suitableProfessionals?.length || 0
          })
        }
        
        // Ensure required fields have valid values for backward compatibility
        if (!booking.treatmentCategory) {
          booking.treatmentCategory = new mongoose.Types.ObjectId()
        }
        if (typeof booking.staticTreatmentPrice !== 'number') {
          booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
        }
        if (typeof booking.staticTherapistPay !== 'number') {
          booking.staticTherapistPay = 0
        }
        if (typeof booking.companyFee !== 'number') {
          booking.companyFee = 0
        }
        if (!booking.consents) {
          booking.consents = {
            customerAlerts: "email",
            patientAlerts: "email",
            marketingOptIn: false,
            termsAccepted: false
          }
        }
        
        await booking.save({ session: mongooseDbSession })
        
        if (suitableProfessionalsResult.success && suitableProfessionalsResult.professionals && suitableProfessionalsResult.professionals.length > 0) {
          logger.info("Found suitable professionals for booking", { 
            bookingId,
            professionalCount: suitableProfessionalsResult.professionals.length 
          })
        } else {
          logger.warn("No suitable professionals found for booking", { bookingId })
        }
        
      } else {
        // Payment failed - ROLLBACK ALL REDEMPTIONS AND CANCEL BOOKING
        await rollbackBookingRedemptions(booking, mongooseDbSession)
        
        booking.status = "cancelled"
        booking.cancellationReason = "Payment failed"
        booking.cancelledBy = "admin"
        booking.paymentDetails.paymentStatus = "failed"
        if (transactionId) {
          booking.paymentDetails.transactionId = transactionId
        }
        
        // Ensure required fields have valid values for backward compatibility
        if (!booking.treatmentCategory) {
          booking.treatmentCategory = new mongoose.Types.ObjectId()
        }
        if (typeof booking.staticTreatmentPrice !== 'number') {
          booking.staticTreatmentPrice = booking.priceDetails?.basePrice || 0
        }
        if (typeof booking.staticTherapistPay !== 'number') {
          booking.staticTherapistPay = 0
        }
        if (typeof booking.companyFee !== 'number') {
          booking.companyFee = 0
        }
        if (!booking.consents) {
          booking.consents = {
            customerAlerts: "email",
            patientAlerts: "email",
            marketingOptIn: false,
            termsAccepted: false
          }
        }
        
        await booking.save({ session: mongooseDbSession })
        
        logger.info("Payment failed - booking cancelled and redemptions rolled back", { 
          bookingId,
          originalStatus: "pending_payment"
        })
      }

      updatedBooking = booking
    })

    // Get the updated booking after transaction
    const finalBooking = await Booking.findById(bookingId)
    
    // Send notifications only after successful payment
    if (paymentStatus === "success" && finalBooking) {
      try {
        const { sendProfessionalBookingNotifications } = await import("@/actions/notification-service")
        const smsResult = await sendProfessionalBookingNotifications(bookingId)
        
        if (smsResult.success) {
          logger.info("Sent SMS notifications to professionals", { 
            bookingId,
            sentCount: smsResult.sentCount 
          })
        } else {
          logger.error("Failed to send SMS notifications to professionals", { 
            bookingId,
            error: smsResult.error 
          })
        }
      } catch (error) {
        logger.error("Error sending SMS notifications", { 
          bookingId,
          error: error instanceof Error ? error.message : String(error) 
        })
      }
    }
    
    // Revalidate relevant paths
    revalidatePath("/dashboard/admin/bookings")
    revalidatePath("/dashboard/member/bookings")
    revalidatePath("/dashboard/member/subscriptions")
    revalidatePath("/dashboard/member/gift-vouchers")
    
    return NextResponse.json({ 
      success: true, 
      booking: finalBooking?.toObject() 
    })
      
  } catch (error) {
    logger.error("Error updating booking status after payment:", {
      bookingId: (await params).bookingId,
      paymentStatus: request.body ? (await request.json()).paymentStatus : 'unknown',
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { success: false, error: "Failed to update booking status" },
      { status: 500 }
    )
  } finally {
    await mongooseDbSession.endSession()
  }
} 