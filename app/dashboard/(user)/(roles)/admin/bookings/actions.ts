"use server"

import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "../../../../../../lib/auth/auth"
import dbConnect from "../../../../../../lib/db/mongoose"
import { logger } from "../../../../../../lib/logs/logger"
import Booking, { type IBooking, type BookingStatus } from "../../../../../../lib/db/models/booking"
import User, { type IUser, UserRole } from "../../../../../../lib/db/models/user"
import Review, { type IReview } from "../../../../../../lib/db/models/review"
import Treatment, { type ITreatment } from "../../../../../../lib/db/models/treatment"
import PaymentMethod, { type IPaymentMethod } from "../../../../../../lib/db/models/payment-method"
import { WorkingHoursSettings } from "../../../../../../lib/db/models/working-hours"
import Coupon from "../../../../../../lib/db/models/coupon"
import GiftVoucher from "../../../../../../lib/db/models/gift-voucher"
import { getNextSequenceValue } from "../../../../../../lib/db/models/counter"
import type { PopulatedBooking } from "../../../../../../types/booking"
import { Types } from "mongoose"
import { unifiedNotificationService } from "../../../../../../lib/notifications/unified-notification-service"
import type { NotificationRecipient } from "../../../../../../lib/notifications/notification-types"
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

// Interfaces
export interface GetAllBookingsFilters extends AdminActionOptions {
  status?: string
  professional?: string
  treatment?: string
  dateRange?: string
  priceRange?: string
  address?: string
  subscription_id?: string
}

export interface BookingUpdateData {
  status?: BookingStatus
  bookingDateTime?: Date
  recipientName?: string
  recipientPhone?: string
  recipientEmail?: string
  notes?: string
  professionalId?: string
  paymentStatus?: "pending" | "paid" | "failed" | "not_required"
}

export interface BookingInitialData {
  treatments: ITreatment[]
  paymentMethods: any[]
  workingHours: any
  activeCoupons: any[]
  activeGiftVouchers: any[]
}

export interface ProfessionalInfo {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  isActive: boolean
  gender?: string
}

export interface CreateBookingData {
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
}

/**
 * Gets all bookings with optional filters and pagination
 */
export async function getAllBookings(
  filters: GetAllBookingsFilters = {}
): Promise<AdminActionResult<PaginatedResult<PopulatedBooking>>> {
  const adminLogger = new AdminLogger("getAllBookings")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    const {
      status,
      professional,
      treatment,
      dateRange,
      priceRange,
      address,
      subscription_id,
      search,
      sortBy = "createdAt",
      sortOrder = "desc"
    } = filters

    adminLogger.info("Fetching bookings", { filters, page, limit })

    const query: Record<string, unknown> = {}

    // Add filters to query
    if (status) query.status = status
    
    if (professional) {
      try {
        validateObjectId(professional, "מזהה מטפל")
        query.professionalId = new Types.ObjectId(professional)
        adminLogger.info("Filtering bookings for professional", { professional })
      } catch (error) {
        adminLogger.error("Invalid professional ID", { professional, error })
        return createErrorResult("מזהה מטפל לא תקין")
      }
    }
    
    if (treatment) {
      try {
        validateObjectId(treatment, "מזהה טיפול")
        query.treatmentId = new Types.ObjectId(treatment)
      } catch (error) {
        adminLogger.error("Invalid treatment ID", { treatment, error })
        return createErrorResult("מזהה טיפול לא תקין")
      }
    }
    
    if (subscription_id) {
      try {
        validateObjectId(subscription_id, "מזהה מנוי")
        query["priceDetails.redeemedUserSubscriptionId"] = new Types.ObjectId(subscription_id)
      } catch (error) {
        adminLogger.error("Invalid subscription ID", { subscription_id, error })
        return createErrorResult("מזהה מנוי לא תקין")
      }
    }

    if (address) {
      query["bookingAddressSnapshot.fullAddress"] = {
        $regex: address,
        $options: "i",
      }
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
      const searchQuery = buildSearchQuery(search, [
        "recipientName",
        "recipientPhone", 
        "recipientEmail",
        "bookingAddressSnapshot.fullAddress",
        "bookingNumber"
      ])
      Object.assign(query, searchQuery)
    }

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments(query)

    adminLogger.info("Found bookings matching query", { totalBookings, query })

    // Get bookings with pagination and sorting
    const sortQuery = buildSortQuery(sortBy, sortOrder)
    const bookings = await Booking.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .populate("treatmentId")
      .populate("professionalId")
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .populate("paymentDetails.paymentMethodId")
      .lean()

    adminLogger.info("Retrieved bookings after pagination", { count: bookings.length })

    // Serialize and transform bookings
    const serializedBookings = bookings.map(booking => {
      const serialized = serializeMongoObject<any>(booking)
      return {
        ...serialized,
        _id: serialized._id.toString(),
        treatmentId: serialized.treatmentId ? {
          ...serialized.treatmentId,
          _id: serialized.treatmentId._id.toString(),
        } : null,
        professionalId: serialized.professionalId ? {
          ...serialized.professionalId,
          _id: serialized.professionalId._id.toString(),
        } : null,
        userId: serialized.userId ? {
          ...serialized.userId,
          _id: serialized.userId._id.toString(),
        } : null,
      }
    }) as PopulatedBooking[]

    return createPaginatedResult(serializedBookings, totalBookings, page, limit)
  } catch (error) {
    return handleAdminError(error, "getAllBookings")
  }
}

/**
 * Gets a specific booking by ID with full population
 */
export async function getBookingById(
  bookingId: string
): Promise<AdminActionResult<PopulatedBooking>> {
  const adminLogger = new AdminLogger("getBookingById")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(bookingId, "מזהה הזמנה")
    
    adminLogger.info("Fetching booking by ID", { bookingId })

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .populate("professionalId")
      .populate("userId")
      .populate("priceDetails.appliedCouponId")
      .populate("priceDetails.appliedGiftVoucherId")
      .populate("priceDetails.redeemedUserSubscriptionId")
      .populate("paymentDetails.paymentMethodId")
      .lean()

    if (!booking) {
      adminLogger.warn("Booking not found", { bookingId })
      return createErrorResult("הזמנה לא נמצאה")
    }

    const serialized = serializeMongoObject<any>(booking)
    const result = {
      ...serialized,
      _id: serialized._id.toString(),
      treatmentId: serialized.treatmentId ? {
        ...serialized.treatmentId,
        _id: serialized.treatmentId._id.toString(),
      } : null,
      professionalId: serialized.professionalId ? {
        ...serialized.professionalId,
        _id: serialized.professionalId._id.toString(),
      } : null,
      userId: serialized.userId ? {
        ...serialized.userId,
        _id: serialized.userId._id.toString(),
      } : null,
    } as PopulatedBooking

    adminLogger.info("Successfully fetched booking", { bookingId })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "getBookingById")
  }
}

/**
 * Gets initial data needed for creating a new booking
 */
export async function getBookingInitialData(): Promise<AdminActionResult<BookingInitialData>> {
  const adminLogger = new AdminLogger("getBookingInitialData")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching booking initial data")

    // Get all active treatments
    const treatments = await Treatment.find({ isActive: true })
      .select("name description pricingType fixedPrice defaultDurationMinutes durations")
      .lean()

    // Get payment methods (system payment methods)
    const paymentMethodsRaw = await PaymentMethod.find({ isSystemMethod: true })
      .select("type displayName isActive")
      .lean()

    // Get working hours settings
    const workingHours = await WorkingHoursSettings.findOne().lean()

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

    const data: BookingInitialData = {
      treatments: serializeMongoObject(treatments),
      paymentMethods: serializeMongoObject(paymentMethodsRaw || []),
      workingHours: serializeMongoObject(workingHours),
      activeCoupons: serializeMongoObject(activeCoupons),
      activeGiftVouchers: serializeMongoObject(activeGiftVouchers)
    }

    adminLogger.info("Successfully fetched initial data")
    return createSuccessResult(data)
  } catch (error) {
    return handleAdminError(error, "getBookingInitialData")
  }
}

/**
 * Updates a booking by admin
 */
export async function updateBookingByAdmin(
  bookingId: string,
  updates: BookingUpdateData
): Promise<AdminActionResult<IBooking>> {
  const adminLogger = new AdminLogger("updateBookingByAdmin")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(bookingId, "מזהה הזמנה")
    
    adminLogger.info("Updating booking", { bookingId, updates })

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return createErrorResult("הזמנה לא נמצאה")
    }

    // Apply updates
    if (updates.status) booking.status = updates.status
    if (updates.bookingDateTime) booking.bookingDateTime = updates.bookingDateTime
    if (updates.recipientName) booking.recipientName = updates.recipientName
    if (updates.recipientPhone) booking.recipientPhone = updates.recipientPhone
    if (updates.recipientEmail) booking.recipientEmail = updates.recipientEmail
    if (updates.notes) booking.notes = updates.notes
    if (updates.professionalId) {
      validateObjectId(updates.professionalId, "מזהה מטפל")
      booking.professionalId = new Types.ObjectId(updates.professionalId)
    }
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

    adminLogger.info("Successfully updated booking", { bookingId })
    return createSuccessResult(serializeMongoObject(booking))
  } catch (error) {
    return handleAdminError(error, "updateBookingByAdmin")
  }
}

/**
 * Assigns a professional to a booking
 */
export async function assignProfessionalToBooking(
  bookingId: string,
  professionalId: string,
): Promise<AdminActionResult<IBooking>> {
  const adminLogger = new AdminLogger("assignProfessionalToBooking")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(bookingId, "מזהה הזמנה")
    validateObjectId(professionalId, "מזהה מטפל")
    
    adminLogger.info("Assigning professional to booking", { bookingId, professionalId })

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return createErrorResult("הזמנה לא נמצאה")
    }

    const professional = await User.findById(professionalId)
    if (!professional || !professional.roles.includes("professional")) {
      return createErrorResult("מטפל לא נמצא")
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

    adminLogger.info("Successfully assigned professional", { bookingId, professionalId })
    return createSuccessResult(serializeMongoObject(booking))
  } catch (error) {
    return handleAdminError(error, "assignProfessionalToBooking")
  }
}

/**
 * Cancels a booking
 */
export async function cancelBooking(
  bookingId: string,
  reason: string,
): Promise<AdminActionResult<IBooking>> {
  const adminLogger = new AdminLogger("cancelBooking")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(bookingId, "מזהה הזמנה")
    
    if (!reason?.trim()) {
      return createErrorResult("סיבת ביטול נדרשת")
    }
    
    adminLogger.info("Cancelling booking", { bookingId, reason })

    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return createErrorResult("הזמנה לא נמצאה")
    }

    if (booking.status === "cancelled" || booking.status === "refunded") {
      return createErrorResult("ההזמנה כבר בוטלה או הוחזרה")
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

    adminLogger.info("Successfully cancelled booking", { bookingId })
    return createSuccessResult(serializeMongoObject(booking))
  } catch (error) {
    return handleAdminError(error, "cancelBooking")
  }
}

/**
 * Gets all available professionals for booking assignment
 */
export async function getAvailableProfessionals(): Promise<AdminActionResult<ProfessionalInfo[]>> {
  const adminLogger = new AdminLogger("getAvailableProfessionals")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching available professionals")

    const professionals = await User.find({
      roles: UserRole.PROFESSIONAL,
      isActive: true,
    })
      .select("name email phone")
      .lean()

    const result = professionals.map(prof => {
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
    })

    adminLogger.info("Successfully fetched professionals", { count: result.length })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "getAvailableProfessionals")
  }
}

/**
 * Gets all suitable professionals for a booking based on treatment and preferences
 */
export async function getSuitableProfessionals(
  bookingId: string
): Promise<AdminActionResult<ProfessionalInfo[]>> {
  const adminLogger = new AdminLogger("getSuitableProfessionals")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(bookingId, "מזהה הזמנה")
    
    adminLogger.info("Fetching suitable professionals", { bookingId })

    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .lean()

    if (!booking) {
      return createErrorResult("הזמנה לא נמצאה")
    }

    // Get all active professionals
    const query: any = {
      roles: UserRole.PROFESSIONAL,
      isActive: true,
    }
    
    // If there's a gender preference, filter by it
    if (booking.therapistGenderPreference !== "any") {
      query.gender = booking.therapistGenderPreference
    }
    
    const professionals = await User.find(query)
      .select("name email phone gender")
      .lean()

    const result = professionals.map(prof => {
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
    })

    adminLogger.info("Successfully fetched suitable professionals", { 
      bookingId, 
      count: result.length 
    })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "getSuitableProfessionals")
  }
}

/**
 * Creates a new booking
 */
export async function createNewBooking(
  bookingData: CreateBookingData
): Promise<AdminActionResult<PopulatedBooking>> {
  const adminLogger = new AdminLogger("createNewBooking")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(bookingData.treatmentId, "מזהה טיפול")
    
    adminLogger.info("Creating new booking", { bookingData })

    // Generate proper booking number using sequence
    const nextBookingNum = await getNextSequenceValue("bookingNumber")
    const bookingNumber = nextBookingNum.toString().padStart(6, "0")
    
    // Get treatment details for proper pricing
    const treatment = await Treatment.findById(bookingData.treatmentId).lean()
    if (!treatment) {
      return createErrorResult("טיפול לא נמצא")
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
      .populate("paymentDetails.paymentMethodId")
      .lean()

    revalidatePath("/dashboard/admin/bookings")

    const result = serializeMongoObject<PopulatedBooking>({
      ...populatedBooking,
      _id: populatedBooking?._id?.toString() || "",
    })

    adminLogger.info("Successfully created booking", { 
      bookingId: result._id,
      bookingNumber 
    })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "createNewBooking")
  }
} 