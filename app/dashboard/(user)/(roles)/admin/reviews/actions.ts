"use server"

import { revalidatePath } from "next/cache"
import Review, { type IReview } from "../../../../../../lib/db/models/review"
import User from "../../../../../../lib/db/models/user"
import Treatment from "../../../../../../lib/db/models/treatment"
import Booking from "../../../../../../lib/db/models/booking"
import { Types } from "mongoose"
import {
  requireAdminSession,
  connectToDatabase,
  AdminLogger,
  handleAdminError,
  validatePaginationOptions,
  revalidateAdminPath,
  createSuccessResult,
  createErrorResult,
  createPaginatedResult,
  serializeMongoObject,
  validateObjectId,
  buildSearchQuery,
  buildSortQuery,
  type AdminActionResult,
  type PaginatedResult,
  type AdminActionOptions
} from "../../../../../../lib/auth/admin-helpers"

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

export interface ReviewFilters extends AdminActionOptions {
  rating?: number
  hasProfessionalResponse?: boolean
  professionalId?: string
  treatmentId?: string
  userId?: string
}

export interface ReviewStatistics {
  totalReviews: number
  averageRating: number
  ratingDistribution: {
    [key: number]: number
  }
  reviewsWithResponse: number
  reviewsWithoutResponse: number
  recentReviews: number
  pendingResponses: number
}

export interface FilterOption {
  value: string
  label: string
}

export interface ReviewFiltersData {
  professionals: FilterOption[]
  treatments: FilterOption[]
  users: FilterOption[]
}

/**
 * Gets all reviews with filtering, sorting, and pagination
 */
export async function getAllReviews(
  filters: ReviewFilters = {}
): Promise<AdminActionResult<PaginatedResult<ReviewData>>> {
  const adminLogger = new AdminLogger("getAllReviews")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    const {
      rating,
      hasProfessionalResponse,
      professionalId,
      treatmentId,
      userId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    adminLogger.info("Fetching reviews", { filters, page, limit })

    // Build query
    const query: Record<string, any> = {}

    // Rating filter
    if (rating) {
      query.rating = rating
    }

    // Professional response filter
    if (typeof hasProfessionalResponse === "boolean") {
      if (hasProfessionalResponse) {
        query.professionalResponse = { $exists: true, $ne: null, $nin: ["", null] }
      } else {
        query.$or = [
          { professionalResponse: { $exists: false } },
          { professionalResponse: null },
          { professionalResponse: "" }
        ]
      }
    }

    // Professional filter
    if (professionalId) {
      validateObjectId(professionalId, "מזהה מטפל")
      query.professionalId = new Types.ObjectId(professionalId)
    }

    // Treatment filter
    if (treatmentId) {
      validateObjectId(treatmentId, "מזהה טיפול")
      query.treatmentId = new Types.ObjectId(treatmentId)
    }

    // User filter
    if (userId) {
      validateObjectId(userId, "מזהה משתמש")
      query.userId = new Types.ObjectId(userId)
    }

    // Search filter
    if (search) {
      const searchQuery = buildSearchQuery(search, ["comment", "professionalResponse"])
      Object.assign(query, searchQuery)
    }

    // Get total count
    const totalReviews = await Review.countDocuments(query)

    adminLogger.info("Found reviews matching query", { totalReviews, query })

    // Get reviews with pagination and sorting
    const sortQuery = buildSortQuery(sortBy, sortOrder)
    const reviews = await Review.find(query)
      .populate("userId", "name email")
      .populate("professionalId", "name email")
      .populate("treatmentId", "name")
      .populate("bookingId", "bookingNumber")
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean()

    // Process reviews
    const reviewsData: ReviewData[] = reviews.map((review: any) => {
      const serialized = serializeMongoObject<any>(review)
      return {
        _id: serialized._id.toString(),
        bookingId: serialized.bookingId?._id?.toString() || "",
        bookingNumber: serialized.bookingId?.bookingNumber,
        userId: serialized.userId?._id?.toString() || "",
        userName: serialized.userId?.name || "משתמש לא ידוע",
        userEmail: serialized.userId?.email || "",
        professionalId: serialized.professionalId?._id?.toString() || "",
        professionalName: serialized.professionalId?.name || "מטפל לא ידוע",
        treatmentId: serialized.treatmentId?._id?.toString() || "",
        treatmentName: serialized.treatmentId?.name || "טיפול לא ידוע",
        rating: serialized.rating,
        comment: serialized.comment,
        professionalResponse: serialized.professionalResponse,
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt
      }
    })

    adminLogger.info("Successfully fetched reviews", { count: reviewsData.length })
    return createPaginatedResult(reviewsData, totalReviews, page, limit)
  } catch (error) {
    return handleAdminError(error, "getAllReviews")
  }
}

/**
 * Get review by ID
 */
export async function getReviewById(reviewId: string): Promise<AdminActionResult<ReviewData>> {
  const adminLogger = new AdminLogger("getReviewById")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(reviewId, "מזהה ביקורת")
    
    adminLogger.info("Fetching review by ID", { reviewId })

    const review = await Review.findById(reviewId)
      .populate("userId", "name email")
      .populate("professionalId", "name email")
      .populate("treatmentId", "name")
      .populate("bookingId", "bookingNumber")
      .lean()

    if (!review) {
      adminLogger.warn("Review not found", { reviewId })
      return createErrorResult("ביקורת לא נמצאה")
    }

    const serialized = serializeMongoObject<any>(review)
    const reviewData: ReviewData = {
      _id: serialized._id.toString(),
      bookingId: serialized.bookingId?._id?.toString() || "",
      bookingNumber: serialized.bookingId?.bookingNumber,
      userId: serialized.userId?._id?.toString() || "",
      userName: serialized.userId?.name || "משתמש לא ידוע",
      userEmail: serialized.userId?.email || "",
      professionalId: serialized.professionalId?._id?.toString() || "",
      professionalName: serialized.professionalId?.name || "מטפל לא ידוע",
      treatmentId: serialized.treatmentId?._id?.toString() || "",
      treatmentName: serialized.treatmentId?.name || "טיפול לא ידוע",
      rating: serialized.rating,
      comment: serialized.comment,
      professionalResponse: serialized.professionalResponse,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully fetched review", { reviewId })
    return createSuccessResult(reviewData)
  } catch (error) {
    return handleAdminError(error, "getReviewById")
  }
}

/**
 * Updates or adds a professional response to a review
 */
export async function updateReviewResponse(
  reviewId: string,
  response: string
): Promise<AdminActionResult<ReviewData>> {
  const adminLogger = new AdminLogger("updateReviewResponse")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(reviewId, "מזהה ביקורת")
    
    if (!response?.trim()) {
      return createErrorResult("תגובה נדרשת")
    }

    adminLogger.info("Updating review response", { reviewId })

    const review = await Review.findById(reviewId)
    if (!review) {
      adminLogger.warn("Review not found for response update", { reviewId })
      return createErrorResult("ביקורת לא נמצאה")
    }

    review.professionalResponse = response.trim()
    review.updatedAt = new Date()
    await review.save()

    revalidateAdminPath("/dashboard/admin/reviews")

    // Get updated review with populated fields
    const updatedReview = await Review.findById(reviewId)
      .populate("userId", "name email")
      .populate("professionalId", "name email")
      .populate("treatmentId", "name")
      .populate("bookingId", "bookingNumber")
      .lean()

    const serialized = serializeMongoObject<any>(updatedReview)
    const reviewData: ReviewData = {
      _id: serialized._id.toString(),
      bookingId: serialized.bookingId?._id?.toString() || "",
      bookingNumber: serialized.bookingId?.bookingNumber,
      userId: serialized.userId?._id?.toString() || "",
      userName: serialized.userId?.name || "משתמש לא ידוע",
      userEmail: serialized.userId?.email || "",
      professionalId: serialized.professionalId?._id?.toString() || "",
      professionalName: serialized.professionalId?.name || "מטפל לא ידוע",
      treatmentId: serialized.treatmentId?._id?.toString() || "",
      treatmentName: serialized.treatmentId?.name || "טיפול לא ידוע",
      rating: serialized.rating,
      comment: serialized.comment,
      professionalResponse: serialized.professionalResponse,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully updated review response", { reviewId })
    return createSuccessResult(reviewData)
  } catch (error) {
    return handleAdminError(error, "updateReviewResponse")
  }
}

/**
 * Deletes a professional response from a review
 */
export async function deleteProfessionalResponse(reviewId: string): Promise<AdminActionResult<ReviewData>> {
  const adminLogger = new AdminLogger("deleteProfessionalResponse")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(reviewId, "מזהה ביקורת")
    
    adminLogger.info("Deleting professional response", { reviewId })

    const review = await Review.findById(reviewId)
    if (!review) {
      adminLogger.warn("Review not found for response deletion", { reviewId })
      return createErrorResult("ביקורת לא נמצאה")
    }

    review.professionalResponse = undefined
    review.updatedAt = new Date()
    await review.save()

    revalidateAdminPath("/dashboard/admin/reviews")

    // Get updated review with populated fields
    const updatedReview = await Review.findById(reviewId)
      .populate("userId", "name email")
      .populate("professionalId", "name email")
      .populate("treatmentId", "name")
      .populate("bookingId", "bookingNumber")
      .lean()

    const serialized = serializeMongoObject<any>(updatedReview)
    const reviewData: ReviewData = {
      _id: serialized._id.toString(),
      bookingId: serialized.bookingId?._id?.toString() || "",
      bookingNumber: serialized.bookingId?.bookingNumber,
      userId: serialized.userId?._id?.toString() || "",
      userName: serialized.userId?.name || "משתמש לא ידוע",
      userEmail: serialized.userId?.email || "",
      professionalId: serialized.professionalId?._id?.toString() || "",
      professionalName: serialized.professionalId?.name || "מטפל לא ידוע",
      treatmentId: serialized.treatmentId?._id?.toString() || "",
      treatmentName: serialized.treatmentId?.name || "טיפול לא ידוע",
      rating: serialized.rating,
      comment: serialized.comment,
      professionalResponse: serialized.professionalResponse,
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully deleted professional response", { reviewId })
    return createSuccessResult(reviewData)
  } catch (error) {
    return handleAdminError(error, "deleteProfessionalResponse")
  }
}

/**
 * Deletes a review
 */
export async function deleteReview(reviewId: string): Promise<AdminActionResult<boolean>> {
  const adminLogger = new AdminLogger("deleteReview")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(reviewId, "מזהה ביקורת")
    
    adminLogger.info("Deleting review", { reviewId })

    const review = await Review.findById(reviewId)
    if (!review) {
      adminLogger.warn("Review not found for deletion", { reviewId })
      return createErrorResult("ביקורת לא נמצאה")
    }

    await Review.findByIdAndDelete(reviewId)
    revalidateAdminPath("/dashboard/admin/reviews")

    adminLogger.info("Successfully deleted review", { reviewId })
    return createSuccessResult(true)
  } catch (error) {
    return handleAdminError(error, "deleteReview")
  }
}

/**
 * Gets review statistics
 */
export async function getReviewStatistics(): Promise<AdminActionResult<ReviewStatistics>> {
  const adminLogger = new AdminLogger("getReviewStatistics")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching review statistics")

    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())

    // Run all queries in parallel for better performance
    const [
      totalReviews,
      averageRatingResult,
      ratingDistribution,
      reviewsWithResponse,
      reviewsWithoutResponse,
      recentReviews
    ] = await Promise.all([
      Review.countDocuments({}),
      Review.aggregate([
        { $group: { _id: null, averageRating: { $avg: "$rating" } } }
      ]),
      Review.aggregate([
        { $group: { _id: "$rating", count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Review.countDocuments({ 
        professionalResponse: { $exists: true, $ne: null, $nin: ["", null] } 
      }),
      Review.countDocuments({ 
        $or: [
          { professionalResponse: { $exists: false } },
          { professionalResponse: null },
          { professionalResponse: "" }
        ]
      }),
      Review.countDocuments({ createdAt: { $gte: lastMonth } })
    ])

    const averageRating = averageRatingResult[0]?.averageRating || 0

    // Build rating distribution object
    const ratingDist: { [key: number]: number } = {}
    for (let i = 1; i <= 5; i++) {
      ratingDist[i] = 0
    }
    ratingDistribution.forEach((item: any) => {
      ratingDist[item._id] = item.count
    })

    const statistics: ReviewStatistics = {
      totalReviews,
      averageRating: Math.round(averageRating * 100) / 100,
      ratingDistribution: ratingDist,
      reviewsWithResponse,
      reviewsWithoutResponse,
      recentReviews,
      pendingResponses: reviewsWithoutResponse
    }

    adminLogger.info("Successfully fetched review statistics", statistics)
    return createSuccessResult(statistics)
  } catch (error) {
    return handleAdminError(error, "getReviewStatistics")
  }
}

/**
 * Gets filter options for reviews
 */
export async function getReviewFilters(): Promise<AdminActionResult<ReviewFiltersData>> {
  const adminLogger = new AdminLogger("getReviewFilters")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching review filters")

    // Get all unique professionals, treatments, and users from reviews
    const [professionals, treatments, users] = await Promise.all([
      Review.aggregate([
        { $group: { _id: "$professionalId" } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "professional" } },
        { $unwind: "$professional" },
        { $project: { _id: 1, name: "$professional.name", email: "$professional.email" } },
        { $sort: { name: 1 } }
      ]),
      Review.aggregate([
        { $group: { _id: "$treatmentId" } },
        { $lookup: { from: "treatments", localField: "_id", foreignField: "_id", as: "treatment" } },
        { $unwind: "$treatment" },
        { $project: { _id: 1, name: "$treatment.name" } },
        { $sort: { name: 1 } }
      ]),
      Review.aggregate([
        { $group: { _id: "$userId" } },
        { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
        { $unwind: "$user" },
        { $project: { _id: 1, name: "$user.name", email: "$user.email" } },
        { $sort: { name: 1 } }
      ])
    ])

    const filtersData: ReviewFiltersData = {
      professionals: professionals.map((prof: any) => ({
        value: prof._id.toString(),
        label: prof.name || prof.email || `מטפל ${prof._id.toString().slice(-6)}`
      })),
      treatments: treatments.map((treatment: any) => ({
        value: treatment._id.toString(),
        label: treatment.name || `טיפול ${treatment._id.toString().slice(-6)}`
      })),
      users: users.map((user: any) => ({
        value: user._id.toString(),
        label: user.name || user.email || `משתמש ${user._id.toString().slice(-6)}`
      }))
    }

    adminLogger.info("Successfully fetched review filters", { 
      professionalsCount: filtersData.professionals.length,
      treatmentsCount: filtersData.treatments.length,
      usersCount: filtersData.users.length
    })
    return createSuccessResult(filtersData)
  } catch (error) {
    return handleAdminError(error, "getReviewFilters")
  }
} 