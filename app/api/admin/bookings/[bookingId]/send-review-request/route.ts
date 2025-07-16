import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { logger } from "@/lib/logs/logger"
import { requireAdminSession } from "@/lib/auth/require-admin-session"
import mongoose from "mongoose"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    await dbConnect()
    
    // Check admin session
    const session = await requireAdminSession()
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const { bookingId } = await params

    if (!bookingId || !mongoose.Types.ObjectId.isValid(bookingId)) {
      return NextResponse.json(
        { success: false, error: "מזהה הזמנה לא תקין" },
        { status: 400 }
      )
    }

    const Booking = (await import("@/lib/db/models/booking")).default
    const Review = (await import("@/lib/db/models/review")).default

    // Get booking with populated data
    const booking = await Booking.findById(bookingId)
      .populate('userId', 'name email phone notificationPreferences')
      .populate('treatmentId', 'name')
      .populate('professionalId', 'name')
      .lean()

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "הזמנה לא נמצאה" },
        { status: 404 }
      )
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return NextResponse.json(
        { success: false, error: "ניתן לשלוח בקשה לחוות דעת רק עבור הזמנות שהושלמו" },
        { status: 400 }
      )
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId }).lean()
    if (existingReview) {
      return NextResponse.json(
        { success: false, error: "כבר נכתבה חוות דעת עבור הזמנה זו" },
        { status: 400 }
      )
    }

    // Get request options
    const requestBody = await request.json()
    const { sms = true, email = true } = requestBody

    // Send review request
    try {
      const { unifiedNotificationService } = await import("@/lib/notifications/unified-notification-service")
      
      const customer = booking.userId as any
      const treatment = booking.treatmentId as any
      const professional = booking.professionalId as any

      if (!customer || !treatment || !professional) {
        return NextResponse.json(
          { success: false, error: "חסרים נתונים בסיסיים להזמנה" },
          { status: 400 }
        )
      }

      // Create review URL
      const reviewUrl = `${process.env.NEXT_PUBLIC_APP_URL}/review/booking/${bookingId}`

      const notificationData = {
        type: "review_request" as const,
        customerName: customer.name,
        treatmentName: treatment.name,
        professionalName: professional.name,
        reviewUrl: reviewUrl,
        bookingId: bookingId,
        bookingNumber: booking.bookingNumber || `#${bookingId.slice(-8)}`
      }

      // Prepare notification recipients based on admin selection
      const recipients = []
      const lang = customer.notificationPreferences?.language || "he"
      const customerName = booking.recipientName || customer.name

      // Add email if requested and customer has email
      if (email && (booking.recipientEmail || customer.email)) {
        recipients.push({
          type: "email" as const,
          value: booking.recipientEmail || customer.email,
          name: customerName,
          language: lang
        })
      }
      
      // Add SMS if requested and customer has phone
      if (sms && (booking.recipientPhone || customer.phone)) {
        recipients.push({
          type: "phone" as const,
          value: booking.recipientPhone || customer.phone,
          language: lang
        })
      }

      if (recipients.length === 0) {
        return NextResponse.json(
          { success: false, error: "לא נבחרו אמצעי יצירת קשר או שאין פרטי קשר זמינים" },
          { status: 400 }
        )
      }

      await unifiedNotificationService.sendNotificationToMultiple(recipients, notificationData)

      logger.info("Review request sent by admin", {
        bookingId,
        adminUserId: session.user.id,
        customerName: customer.name,
        recipientCount: recipients.length,
        sentVia: recipients.map(r => r.type).join(", ")
      })

      const sentVia = recipients.map(r => r.type === "email" ? "אימייל" : "SMS").join(" ו-")

      return NextResponse.json({
        success: true,
        message: `בקשה לחוות דעת נשלחה בהצלחה ללקוח דרך ${sentVia}`
      })

    } catch (notificationError) {
      logger.error("Failed to send review request notification", {
        bookingId,
        error: notificationError
      })
      
      return NextResponse.json(
        { success: false, error: "שגיאה בשליחת ההודעה ללקוח" },
        { status: 500 }
      )
    }

  } catch (error) {
    logger.error("Error sending review request:", error)
    return NextResponse.json(
      { success: false, error: "שגיאה בשרת" },
      { status: 500 }
    )
  }
} 