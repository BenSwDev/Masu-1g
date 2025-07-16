"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking, { type IBooking, type BookingStatus } from "@/lib/db/models/booking"
import User, { type IUser, UserRole } from "@/lib/db/models/user"
import Review, { type IReview } from "@/lib/db/models/review"
import Treatment, { type ITreatment } from "@/lib/db/models/treatment"
// Removed PaymentMethod import - using CARDCOM only
import { WorkingHoursSettings } from "@/lib/db/models/working-hours"
import Coupon from "@/lib/db/models/coupon"
import GiftVoucher from "@/lib/db/models/gift-voucher"
import { getNextSequenceValue } from "@/lib/db/models/counter"
import { logger } from "@/lib/logs/logger"
import type { PopulatedBooking } from "@/types/booking"
import { Types } from "mongoose"
import { unifiedNotificationService } from "@/lib/notifications/unified-notification-service"
import type { NotificationRecipient } from "@/lib/notifications/notification-types"

export interface GetAllBookingsFilters {
  status?: string
  professional?: string
  treatment?: string
  dateRange?: string
  priceRange?: string
  address?: string
  subscription_id?: string
  page?: number
  limit?: number
  sortBy?: string
  sortDirection?: "asc" | "desc"
  search?: string
}

export interface GetAllBookingsResult {
  bookings: PopulatedBooking[]
  totalPages: number
  totalBookings: number
}

export interface UpdateBookingResult {
  success: boolean
  error?: string
  booking?: IBooking
}

export interface AssignProfessionalResult {
  success: boolean
  error?: string
  booking?: IBooking
}

export interface GetBookingByIdResult {
  success: boolean
  error?: string
  booking?: PopulatedBooking
}

export interface CancelBookingResult {
  success: boolean
  error?: string
  booking?: IBooking
}

export interface GetBookingInitialDataResult {
  success: boolean
  error?: string
  data?: {
    treatments: ITreatment[]
    paymentMethods: any[]
    workingHours: any
    activeCoupons: any[]
    activeGiftVouchers: any[]
  }
}

export interface GetAvailableProfessionalsResult {
  success: boolean
  error?: string
  professionals?: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    isActive: boolean
    gender?: string
  }>
}

export interface GetSuitableProfessionalsResult {
  success: boolean
  error?: string
  professionals?: Array<{
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    isActive: boolean
    gender?: string
  }>
}

/**
 * Gets all bookings with optional filters
 * @param filters Optional filters for bookings
 * @returns GetAllBookingsResult
 */
export async function getAllBookings(filters: GetAllBookingsFilters = {}): Promise<GetAllBookingsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      throw new Error("Unauthorized")
    }

    await dbConnect()

    const {
      status,
      professional,
      treatment,
      dateRange,
      priceRange,
      address,
      subscription_id,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortDirection = "desc",
      search,
    } = filters

    const query: Record<string, unknown> = {}

    // Add filters to query
    if (status) query.status = status
    
    if (professional) {
      try {
        // Validate professional ID
        if (!Types.ObjectId.isValid(professional)) {
          console.error("Invalid professional ID:", professional)
          throw new Error("Invalid professional ID format")
        }
        query.professionalId = new Types.ObjectId(professional)
        console.log("Filtering bookings for professional:", professional)
      } catch (error) {
        console.error("Error processing professional filter:", error)
        // Return empty result if professional ID is invalid
        return {
          bookings: [],
          totalPages: 0,
          totalBookings: 0,
        }
      }
    }
    
    if (treatment) {
      try {
        if (!Types.ObjectId.isValid(treatment)) {
          console.error("Invalid treatment ID:", treatment)
          throw new Error("Invalid treatment ID format")
        }
        query.treatmentId = new Types.ObjectId(treatment)
      } catch (error) {
        console.error("Error processing treatment filter:", error)
        return {
          bookings: [],
          totalPages: 0,
          totalBookings: 0,
        }
      }
    }
    
    if (subscription_id) {
      try {
        if (!Types.ObjectId.isValid(subscription_id)) {
          console.error("Invalid subscription ID:", subscription_id)
          throw new Error("Invalid subscription ID format")
        }
        query["priceDetails.redeemedUserSubscriptionId"] = new Types.ObjectId(subscription_id)
      } catch (error) {
        console.error("Error processing subscription filter:", error)
        return {
          bookings: [],
          totalPages: 0,
          totalBookings: 0,
        }
      }
    }

    if (address) query["bookingAddressSnapshot.fullAddress"] = {
      $regex: address,
      $options: "i",
    }

    // Handle date range filter
    if (dateRange) {
      const [startDate, endDate] = dateRange.split(",")
      if (startDate && endDate) {
        query.bookingDateTime = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        }
      }
    }

    // Handle price range filter
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split(",")
      if (minPrice && maxPrice) {
        query["priceDetails.finalAmount"] = {
          $gte: Number(minPrice),
          $lte: Number(maxPrice),
        }
      }
    }

    // Handle search
    if (search) {
      query.$or = [
        { "recipientName": { $regex: search, $options: "i" } },
        { "recipientPhone": { $regex: search, $options: "i" } },
        { "recipientEmail": { $regex: search, $options: "i" } },
        { "bookingAddressSnapshot.fullAddress": { $regex: search, $options: "i" } },
        { "bookingNumber": { $regex: search, $options: "i" } },
      ]
    }

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(query)
    const totalPages = Math.ceil(totalBookings / limit)

    console.log("Booking query:", JSON.stringify(query, null, 2))
    console.log(`Found ${totalBookings} bookings matching query`)

    // Get bookings with pagination and sorting
    const bookings = await Booking.find(query)
      .sort({ [sortBy]: sortDirection === "desc" ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("treatmentId")
      .populate({
        path: "professionalId",
        select: "name email phone gender"
      })
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .lean()

    console.log(`Retrieved ${bookings.length} bookings after pagination`)
    
    // Enhance professional data with profile information
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default
    
    for (const booking of bookings) {
      if (booking.professionalId && booking.professionalId._id) {
        try {
          const professionalProfile = await ProfessionalProfile.findOne({
            userId: booking.professionalId._id,
            status: 'active'
          }).lean()
          
          if (professionalProfile && professionalProfile.workAreas && professionalProfile.workAreas.length > 0) {
            // Find matching work area for this booking's city
            const bookingCity = booking.bookingAddressSnapshot?.city
            let matchingWorkArea: any = null
            try {
              matchingWorkArea = (professionalProfile.workAreas as any[]).find((area: any) => 
                area.cityName === bookingCity || area.coveredCities?.includes(bookingCity)
              )
            } catch (error) {
              console.error("Error finding matching work area:", error)
            }
            
            // Add city and distance info to professional
            (booking.professionalId as any).city = matchingWorkArea?.cityName || (professionalProfile.workAreas[0] as any)?.cityName || "לא צוין"
            
            // Calculate distance if coordinates are available
            if (matchingWorkArea && 'coordinates' in matchingWorkArea && matchingWorkArea.coordinates && 
                booking.bookingAddressSnapshot && 'coordinates' in booking.bookingAddressSnapshot && 
                booking.bookingAddressSnapshot.coordinates) {
              const workAreaCoords = matchingWorkArea.coordinates as any
              const bookingCoords = booking.bookingAddressSnapshot.coordinates as any
              
              if (workAreaCoords.lat && workAreaCoords.lng && bookingCoords.lat && bookingCoords.lng) {
                const lat1 = workAreaCoords.lat
                const lon1 = workAreaCoords.lng
                const lat2 = bookingCoords.lat
                const lon2 = bookingCoords.lng
                
                // Haversine formula for distance calculation
                const R = 6371 // Earth's radius in km
                const dLat = (lat2 - lat1) * Math.PI / 180
                const dLon = (lon2 - lon1) * Math.PI / 180
                const a = 
                  Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2)
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
                const distanceKm = Math.round(R * c);
                (booking.professionalId as any).distanceKm = distanceKm
              }
            }
          }
        } catch (error) {
          console.error("Error enhancing professional data:", error)
        }
      }
    }
    
    // Log first booking details for debugging
    if (bookings.length > 0) {
      console.log("First booking sample:", {
        id: bookings[0]._id,
        bookingNumber: bookings[0].bookingNumber,
        professionalId: bookings[0].professionalId,
        status: bookings[0].status
      })
    }

    return {
      bookings: bookings.map(booking => ({
        ...booking,
        _id: booking._id.toString(),
        treatmentId: booking.treatmentId ? {
          ...booking.treatmentId,
          _id: new Types.ObjectId(booking.treatmentId._id.toString()),
        } : null,
        professionalId: booking.professionalId ? {
          ...booking.professionalId,
          _id: new Types.ObjectId(booking.professionalId._id.toString()),
        } : null,
        userId: booking.userId ? {
          ...booking.userId,
          _id: new Types.ObjectId(booking.userId._id.toString()),
        } : null,
      })) as unknown as PopulatedBooking[],
      totalPages,
      totalBookings,
    }
  } catch (error) {
    logger.error("Error fetching all bookings:", error)
    throw error
  }
}

/**
 * Gets a specific booking by ID with full population
 * @param bookingId The ID of the booking to retrieve
 * @returns GetBookingByIdResult
 */
export async function getBookingById(bookingId: string): Promise<GetBookingByIdResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .populate("professionalId")
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    return {
      success: true,
      booking: {
        ...booking,
        _id: new Types.ObjectId(booking._id.toString()),
        treatmentId: booking.treatmentId ? {
          ...booking.treatmentId,
          _id: new Types.ObjectId(booking.treatmentId._id.toString()),
        } : null,
        professionalId: booking.professionalId ? {
          ...booking.professionalId,
          _id: new Types.ObjectId(booking.professionalId._id.toString()),
        } : null,
        userId: booking.userId ? {
          ...booking.userId,
          _id: new Types.ObjectId(booking.userId._id.toString()),
        } : null,
      } as unknown as PopulatedBooking,
    }
  } catch (error) {
    logger.error("Error fetching booking by ID:", error)
    return { success: false, error: "Failed to fetch booking" }
  }
}

/**
 * Gets initial data needed for creating a new booking
 * @returns GetBookingInitialDataResult
 */
export async function getBookingInitialData(): Promise<GetBookingInitialDataResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Get all active treatments
    const treatments = await Treatment.find({ isActive: true })
      .select("name description pricingType fixedPrice defaultDurationMinutes durations")
      .lean()

    // Get payment methods (system payment methods) - just get basic info
    // Removed PaymentMethod - using CARDCOM only
    const paymentMethodsRaw: any[] = []

    // Get working hours settings
    const workingHours = await (WorkingHoursSettings as any).findOne().lean()

    // Get active coupons
    const activeCoupons = await Coupon.find({
      isActive: true,
      expiresAt: { $gt: new Date() },
      $or: [
        { maxUses: { $exists: false } },
        { $expr: { $lt: ["$currentUses", "$maxUses"] } }
      ]
    }).lean()

    // Get active gift vouchers
    const activeGiftVouchers = await GiftVoucher.find({
      status: "active",
      expiresAt: { $gt: new Date() },
      $expr: { $gt: ["$remainingValue", 0] }
    }).lean()

    return {
      success: true,
      data: {
        treatments,
        paymentMethods: paymentMethodsRaw || [],
        workingHours,
        activeCoupons,
        activeGiftVouchers
      }
    }
  } catch (error) {
    logger.error("Error fetching booking initial data:", error)
    return { success: false, error: "Failed to fetch initial data" }
  }
}

/**
 * Updates a booking by admin
 * @param bookingId The ID of the booking to update
 * @param updates The updates to apply to the booking
 * @returns UpdateBookingResult
 */
export async function updateBookingByAdmin(
  bookingId: string,
  updates: {
    status?: BookingStatus
    bookingDateTime?: Date
    recipientName?: string
    recipientPhone?: string
    recipientEmail?: string
    notes?: string
    professionalId?: string
    paymentStatus?: "pending" | "paid" | "failed" | "not_required"
  }
): Promise<UpdateBookingResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    // Apply updates
    if (updates.status) booking.status = updates.status
    if (updates.bookingDateTime) booking.bookingDateTime = updates.bookingDateTime
    if (updates.recipientName) booking.recipientName = updates.recipientName
    if (updates.recipientPhone) booking.recipientPhone = updates.recipientPhone
    if (updates.recipientEmail) booking.recipientEmail = updates.recipientEmail
    if (updates.notes) booking.notes = updates.notes
    if (updates.professionalId) booking.professionalId = new Types.ObjectId(updates.professionalId)
    if (updates.paymentStatus) booking.paymentDetails.paymentStatus = updates.paymentStatus

    // Ensure required fields have valid values for backward compatibility
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

    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error updating booking:", error)
    return { success: false, error: "Failed to update booking" }
  }
}

/**
 * Assigns a professional to a booking
 * @param bookingId The ID of the booking
 * @param professionalId The ID of the professional to assign
 * @returns AssignProfessionalResult
 */
export async function assignProfessionalToBooking(
  bookingId: string,
  professionalId: string,
): Promise<AssignProfessionalResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    const professional = await User.findById(professionalId)
    if (!professional || !professional.roles.includes("professional")) {
      return { success: false, error: "Professional not found" }
    }

    booking.professionalId = new Types.ObjectId(professionalId)
    booking.status = "confirmed"
    
    // Ensure required fields have valid values for backward compatibility
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

    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error assigning professional:", error)
    return { success: false, error: "Failed to assign professional" }
  }
}

/**
 * Cancels a booking
 * @param bookingId The ID of the booking to cancel
 * @param reason The reason for cancellation
 * @returns CancelBookingResult
 */
export async function cancelBooking(
  bookingId: string,
  reason: string,
): Promise<CancelBookingResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    if (booking.status === "cancelled" || booking.status === "refunded") {
      return { success: false, error: "Booking is already cancelled or refunded" }
    }

    booking.status = "cancelled"
    booking.cancellationReason = reason
    booking.cancelledBy = "admin"
    
    // Ensure required fields have valid values for backward compatibility
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
    
    await booking.save()
    revalidatePath("/dashboard/admin/bookings")

    return { success: true, booking }
  } catch (error) {
    logger.error("Error cancelling booking:", error)
    return { success: false, error: "Failed to cancel booking" }
  }
}

/**
 * Gets all available professionals for booking assignment
 * @returns GetAvailableProfessionalsResult
 */
export async function getAvailableProfessionals(): Promise<GetAvailableProfessionalsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const professionals = await User.find({
      roles: UserRole.PROFESSIONAL,
      isActive: true,
    })
      .select("name email phone")
      .lean()

    return {
      success: true,
      professionals: professionals.map(prof => {
        const [firstName, ...lastNameParts] = prof.name.split(" ")
        const lastName = lastNameParts.join(" ")
        return {
          _id: prof._id.toString(),
          firstName,
          lastName,
          email: prof.email || "",
          phone: prof.phone || "",
          isActive: true,
        }
      }),
    }
  } catch (error) {
    logger.error("Error fetching available professionals:", error)
    return { success: false, error: "Failed to fetch professionals" }
  }
}

/**
 * Gets all suitable professionals for a booking based on treatment and preferences
 * @param bookingId The ID of the booking
 * @returns GetSuitableProfessionalsResult
 */
export async function getSuitableProfessionals(bookingId: string): Promise<GetSuitableProfessionalsResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .lean()

    if (!booking) {
      return { success: false, error: "Booking not found" }
    }

    // Get all active professionals
    const professionals = await User.find({
      roles: UserRole.PROFESSIONAL,
      isActive: true,
      // If there's a gender preference, filter by it
      ...(booking.therapistGenderPreference !== "any" && {
        gender: booking.therapistGenderPreference,
      }),
    })
      .select("name email phone gender")
      .lean()

    return {
      success: true,
      professionals: professionals.map(prof => {
        const [firstName, ...lastNameParts] = prof.name.split(" ")
        const lastName = lastNameParts.join(" ")
        return {
          _id: prof._id.toString(),
          firstName,
          lastName,
          email: prof.email || "",
          phone: prof.phone || "",
          isActive: true,
          gender: prof.gender,
        }
      }),
    }
  } catch (error) {
    logger.error("Error fetching suitable professionals:", error)
    return { success: false, error: "Failed to fetch suitable professionals" }
  }
}

export interface CreateBookingResult {
  success: boolean
  error?: string
  booking?: PopulatedBooking
}

/**
 * Creates a new booking
 * @param bookingData The booking data
 * @returns CreateBookingResult
 */
export async function createNewBooking(bookingData: {
  // Customer data
  bookedByUserName?: string
  bookedByUserEmail?: string  
  bookedByUserPhone?: string
  userId?: string
  
  // Recipient data
  recipientName?: string
  recipientEmail?: string
  recipientPhone?: string
  recipientBirthDate?: Date
  recipientGender?: string
  isBookingForSomeoneElse?: boolean
  
  // Treatment data
  treatmentId: string
  startTime: Date
  endTime: Date
  
  // Address data
  bookingAddressSnapshot?: {
    street?: string
    buildingNumber?: string
    city?: string
    postalCode?: string
    floor?: string
    apartment?: string
    notes?: string
    otherInstructions?: string
    coordinates?: {
      lat: number
      lng: number
    }
  }
  
  // Pricing data
  basePrice?: number
  transportFee?: number
  serviceFee?: number
  discountAmount?: number
  totalPrice?: number
  
  // Payment data
  paymentMethod?: string
  paymentStatus?: string
  
  // Additional data
  notes?: string
  isGift?: boolean
  giftGreeting?: string
  couponId?: string
  source?: string
}): Promise<CreateBookingResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    await dbConnect()

    // Generate proper booking number using sequence
    const nextBookingNum = await getNextSequenceValue("bookingNumber")
    const bookingNumber = nextBookingNum.toString().padStart(6, "0")
    
    // Get treatment details for proper pricing
    const treatment = await Treatment.findById(bookingData.treatmentId).lean()
    if (!treatment) {
      return { success: false, error: "Treatment not found" }
    }

    // Calculate proper pricing data
    const staticTreatmentPrice = bookingData.basePrice || treatment.fixedPrice || 0
    const staticTherapistPay = Math.round(staticTreatmentPrice * 0.7) // 70% to therapist
    const companyFee = staticTreatmentPrice - staticTherapistPay
    
    // Create the booking with proper required fields
    const newBooking = new Booking({
      ...bookingData,
      bookingNumber,
      status: "pending_payment",
      bookingDateTime: bookingData.startTime,
      step: 1,
              treatmentCategory: new Types.ObjectId(), // Generate a new ObjectId as category reference
      staticTreatmentPrice,
      staticTherapistPay,
      companyFee,
      isGift: bookingData.isGift || false,
      consents: {
        customerAlerts: "email",
        patientAlerts: "email", 
        marketingOptIn: false,
        termsAccepted: true
      },
      priceDetails: {
        basePrice: staticTreatmentPrice,
        surcharges: [],
        totalSurchargesAmount: 0,
        treatmentPriceAfterSubscriptionOrTreatmentVoucher: staticTreatmentPrice,
        discountAmount: bookingData.discountAmount || 0,
        voucherAppliedAmount: 0,
        finalAmount: (staticTreatmentPrice - (bookingData.discountAmount || 0)),
        isBaseTreatmentCoveredBySubscription: false,
        isBaseTreatmentCoveredByTreatmentVoucher: false,
        isFullyCoveredByVoucherOrSubscription: false,
      },
      paymentDetails: {
        paymentStatus: bookingData.paymentStatus === "paid" ? "paid" : "pending",
      },
      source: (bookingData.source as any) || "new_purchase",
      therapistGenderPreference: "any",
    })

    await newBooking.save()

    // Populate the created booking  
    const populatedBooking = await Booking.findById(newBooking._id)
      .populate("treatmentId")
      .populate("professionalId")
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .lean()

    revalidatePath("/dashboard/admin/bookings")

    return {
      success: true,
      booking: {
        ...populatedBooking,
        _id: populatedBooking?._id?.toString() || "",
      } as unknown as PopulatedBooking
    }
  } catch (error) {
    logger.error("Error creating new booking:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create booking"
    }
  }
}

export interface SendReviewRequestResult {
  success: boolean
  error?: string
  message?: string
}

/**
 * Sends a review request to the customer for a completed booking
 * @param bookingId The booking ID
 * @returns SendReviewRequestResult
 */
export async function sendReviewRequest(bookingId: string): Promise<SendReviewRequestResult> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.roles?.includes("admin")) {
      return { success: false, error: "Unauthorized" }
    }

    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/admin/bookings/${bookingId}/send-review-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()
    
    if (data.success) {
      revalidatePath("/dashboard/admin/bookings")
      return {
        success: true,
        message: data.message || "בקשה לחוות דעת נשלחה בהצלחה"
      }
    } else {
      return {
        success: false,
        error: data.error || "שגיאה בשליחת בקשה לחוות דעת"
      }
    }
  } catch (error) {
    logger.error("Error sending review request:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "שגיאה בשליחת בקשה לחוות דעת"
    }
  }
}