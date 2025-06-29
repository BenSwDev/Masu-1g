"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import { logger } from "@/lib/logs/logger"
import dbConnect from "@/lib/db/mongoose"
import Review, { type IReview } from "@/lib/db/models/review"
import User from "@/lib/db/models/user"
import Treatment from "@/lib/db/models/treatment"
import Booking from "@/lib/db/models/booking"
import { Types } from "mongoose"

// Types
export interface ReviewData {
  _id: string
  bookingId: string
  userId: string
  userName: string
  userEmail: string
  professionalId: string
  professionalName: string
  treatmentId: string
  treatmentName: string
  rating: number
  comment?: string
  professionalResponse?: string
  createdAt: string
  updatedAt: string
  bookingNumber?: string
}

export interface GetAllReviewsOptions {
  page?: number
  limit?: number
  rating?: number
  hasProfessionalResponse?: boolean
  professionalId?: string
  treatmentId?: string
  sortBy?: "createdAt" | "rating"
  sortDirection?: "asc" | "desc"
  search?: string
}

export interface GetAllReviewsResult {
  success: boolean
  reviews?: ReviewData[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
  error?: string
}

export interface UpdateProfessionalResponseResult {
  success: boolean
  error?: string
}

export interface DeleteReviewResult {
  success: boolean
  error?: string
}

export interface GetReviewStatisticsResult {
  success: boolean
  statistics?: {
    totalReviews: number
    averageRating: number
    ratingDistribution: {
      [key: number]: number
    }
    reviewsWithResponse: number
    reviewsWithoutResponse: number
  }
  error?: string
}

/**
 * Gets all reviews with filtering, sorting, and pagination
 * @param options Filtering, sorting, and pagination options
 * @returns GetAllReviewsResult
 */
export async function getAllReviews(options: GetAllReviewsOptions = {}): Promise<GetAllReviewsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const {
      page = 1,
      limit = 20,
      rating,
      hasProfessionalResponse,
      professionalId,
      treatmentId,
      sortBy = "createdAt",
      sortDirection = "desc",
      search,
    } = options

    // Build query
    const query: Record<string, any> = {}

    if (rating) {
      query.rating = rating
    }

    if (typeof hasProfessionalResponse === "boolean") {
      if (hasProfessionalResponse) {
        query.professionalResponse = { $exists: true, $ne: null, $ne: "" }
      } else {
        query.$or = [
          { professionalResponse: { $exists: false } },
          { professionalResponse: null },
          { professionalResponse: "" }
        ]
      }
    }

    if (professionalId) {
      query.professionalId = new Types.ObjectId(professionalId)
    }

    if (treatmentId) {
      query.treatmentId = new Types.ObjectId(treatmentId)
    }

    // Text search in comments
    if (search) {
      query.$or = [
        { comment: { $regex: search, $options: "i" } },
        { professionalResponse: { $regex: search, $options: "i" } }
      ]
    }

    // Sorting
    const sort: Record<string, 1 | -1> = {}
    sort[sortBy] = sortDirection === "asc" ? 1 : -1

    const skip = (page - 1) * limit

    // Execute queries
    const [reviews, total] = await Promise.all([
      Review.find(query)
        .populate("userId", "name email")
        .populate("professionalId", "name email")
        .populate("treatmentId", "name")
        .populate("bookingId", "bookingNumber")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments(query),
    ])

    const reviewsData: ReviewData[] = reviews.map((review: any) => ({
      _id: review._id.toString(),
      bookingId: review.bookingId._id.toString(),
      bookingNumber: review.bookingId?.bookingNumber,
      userId: review.userId._id.toString(),
      userName: review.userId?.name || "Unknown",
      userEmail: review.userId?.email || "",
      professionalId: review.professionalId._id.toString(),
      professionalName: review.professionalId?.name || "Unknown",
      treatmentId: review.treatmentId._id.toString(),
      treatmentName: review.treatmentId?.name || "Unknown",
      rating: review.rating,
      comment: review.comment,
      professionalResponse: review.professionalResponse,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    }))

    return {
      success: true,
      reviews: reviewsData,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    logger.error("Error fetching reviews:", error)
    return { success: false, error: "Failed to fetch reviews" }
  }
}

/**
 * Updates or adds a professional response to a review
 * @param reviewId Review ID
 * @param response Professional response text
 * @returns UpdateProfessionalResponseResult
 */
export async function updateReviewResponse(
  reviewId: string,
  response: string
): Promise<UpdateProfessionalResponseResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    if (!response?.trim()) {
      return { success: false, error: "Response cannot be empty" }
    }

    if (response.length > 1000) {
      return { success: false, error: "Response cannot exceed 1000 characters" }
    }

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { professionalResponse: response.trim() },
      { new: true }
    )

    if (!review) {
      return { success: false, error: "Review not found" }
    }

    revalidatePath("/dashboard/admin/reviews")
    return { success: true }
  } catch (error) {
    logger.error("Error updating professional response:", error)
    return { success: false, error: "Failed to update professional response" }
  }
}

/**
 * Deletes a professional response from a review
 * @param reviewId Review ID
 * @returns UpdateProfessionalResponseResult
 */
export async function deleteProfessionalResponse(reviewId: string): Promise<UpdateProfessionalResponseResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const review = await Review.findByIdAndUpdate(
      reviewId,
      { $unset: { professionalResponse: 1 } },
      { new: true }
    )

    if (!review) {
      return { success: false, error: "Review not found" }
    }

    revalidatePath("/dashboard/admin/reviews")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting professional response:", error)
    return { success: false, error: "Failed to delete professional response" }
  }
}

/**
 * Deletes a review (admin only, extreme cases)
 * @param reviewId Review ID
 * @returns DeleteReviewResult
 */
export async function deleteReview(reviewId: string): Promise<DeleteReviewResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const review = await Review.findByIdAndDelete(reviewId)

    if (!review) {
      return { success: false, error: "Review not found" }
    }

    revalidatePath("/dashboard/admin/reviews")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting review:", error)
    return { success: false, error: "Failed to delete review" }
  }
}

/**
 * Gets review statistics for admin dashboard
 * @returns GetReviewStatisticsResult
 */
export async function getReviewStatistics(): Promise<GetReviewStatisticsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const [
      totalReviews,
      averageRatingResult,
      ratingDistribution,
      reviewsWithResponse,
    ] = await Promise.all([
      Review.countDocuments(),
      Review.aggregate([
        { $group: { _id: null, average: { $avg: "$rating" } } }
      ]),
      Review.aggregate([
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Review.countDocuments({
        professionalResponse: { $exists: true, $ne: null, $ne: "" }
      }),
    ])

    const averageRating = averageRatingResult[0]?.average || 0
    const ratingDist: { [key: number]: number } = {}
    
    // Initialize all ratings to 0
    for (let i = 1; i <= 5; i++) {
      ratingDist[i] = 0
    }
    
    // Fill in actual counts
    ratingDistribution.forEach((item: any) => {
      ratingDist[item._id] = item.count
    })

    return {
      success: true,
      statistics: {
        totalReviews,
        averageRating: Math.round(averageRating * 100) / 100,
        ratingDistribution: ratingDist,
        reviewsWithResponse,
        reviewsWithoutResponse: totalReviews - reviewsWithResponse,
      },
    }
  } catch (error) {
    logger.error("Error fetching review statistics:", error)
    return { success: false, error: "Failed to fetch review statistics" }
  }
}

/**
 * Gets lists for filter dropdowns
 * @returns Filter options for professionals and treatments
 */
export async function getReviewFilters(): Promise<{
  success: boolean
  filters?: {
    professionals: Array<{ value: string; label: string }>
    treatments: Array<{ value: string; label: string }>
  }
  error?: string
}> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const [professionals, treatments] = await Promise.all([
      User.find({ roles: "professional" })
        .select("name email")
        .sort({ name: 1 })
        .lean(),
      Treatment.find({ isActive: true })
        .select("name")
        .sort({ name: 1 })
        .lean(),
    ])

    return {
      success: true,
      filters: {
        professionals: professionals.map((prof: any) => ({
          value: prof._id.toString(),
          label: prof.name || prof.email,
        })),
        treatments: treatments.map((treatment: any) => ({
          value: treatment._id.toString(),
          label: treatment.name,
        })),
      },
    }
  } catch (error) {
    logger.error("Error fetching review filters:", error)
    return { success: false, error: "Failed to fetch filter options" }
  }
} 
