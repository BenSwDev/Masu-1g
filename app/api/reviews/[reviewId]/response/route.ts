import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Review from "@/lib/db/models/review"
import { logger } from "@/lib/logs/logger"

export async function POST(
  req: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles || !session.user.roles.includes("admin")) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    await dbConnect()

    const { professionalResponse } = await req.json()

    if (!professionalResponse || !professionalResponse.trim()) {
      return NextResponse.json({ success: false, error: "Professional response is required" }, { status: 400 })
    }

    // Find the review
    const review = await Review.findById(params.reviewId)
    if (!review) {
      return NextResponse.json({ success: false, error: "Review not found" }, { status: 404 })
    }

    // Update the professional response
    review.professionalResponse = professionalResponse.trim()
    review.updatedAt = new Date()
    await review.save()

    // Log the action
    logger.info(`Professional response updated for review ${params.reviewId} by admin ${session.user.id}`)

    return NextResponse.json({ success: true, review })
  } catch (error) {
    logger.error("Error updating professional response:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
} 