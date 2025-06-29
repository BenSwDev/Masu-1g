import { NextRequest, NextResponse } from "next/server"
import { confirmGuestSubscriptionPurchase } from "@/actions/user-subscription-actions"
import { logger } from "@/lib/logs/logger"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subscriptionId, paymentId, success, guestInfo } = body

    // Validate required fields
    if (!subscriptionId || typeof success !== "boolean") {
      return NextResponse.json(
        { success: false, error: "Missing required fields: subscriptionId, success" },
        { status: 400 }
      )
    }

    // Validate guestInfo for guest purchases
    if (!guestInfo || !guestInfo.name || !guestInfo.phone) {
      return NextResponse.json(
        { success: false, error: "Missing required guest information: name, phone" },
        { status: 400 }
      )
    }

    logger.info("Subscription payment confirmation request received", {
      subscriptionId,
      paymentId,
      success,
      guestEmail: guestInfo.email
    })

    // Confirm the subscription purchase
    const result = await confirmGuestSubscriptionPurchase({
      subscriptionId,
      paymentId: paymentId || `payment_${Date.now()}`,
      success,
      guestInfo
    })

    if (result.success) {
      logger.info("Subscription payment confirmed successfully", {
        subscriptionId,
        paymentSuccess: success
      })
      return NextResponse.json(result)
    } else {
      logger.warn("Subscription payment confirmation failed", {
        subscriptionId,
        error: result.error
      })
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    logger.error("Error processing subscription payment confirmation:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 
