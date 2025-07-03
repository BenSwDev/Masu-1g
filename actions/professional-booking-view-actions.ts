"use server"

import mongoose, { type Types } from "mongoose"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import Booking, { type IBooking } from "@/lib/db/models/booking"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { IUser } from "@/lib/db/models/user"
import type { IAddress } from "@/lib/db/models/address"
import { logger } from "@/lib/logs/logger"

// Define a more specific type for the booking details needed by the professional view
export interface BookingDetailsForProfessional
  extends Omit<IBooking, "treatmentId" | "userId" | "addressId" | "professionalId" | "selectedDurationId"> {
  _id: Types.ObjectId
  treatmentId?: {
    _id: Types.ObjectId
    name: string
    defaultDurationMinutes?: number
    selectedDuration?: ITreatmentDuration // Populated based on selectedDurationId
  } | null
  userId?: {
    // Client details - only show if professional is assigned or admin
    _id: Types.ObjectId
    name?: string
    email?: string
    phone?: string
  } | null
  addressId?: Pick<IAddress, "_id" | "fullAddress" | "city" | "street" | "streetNumber"> | null
  professionalId?: {
    _id: Types.ObjectId
    name?: string
  } | null
  status: string // Ensure status is always a string
}

export async function getBookingByIdForProfessional(bookingId: string): Promise<{
  success: boolean
  booking?: BookingDetailsForProfessional
  error?: string
}> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles.includes("professional")) {
    // Allow admin to view too, or create a separate admin view action
    if (!session?.user?.roles.includes("admin")) {
      return { success: false, error: "common.unauthorized" }
    }
  }

  try {
    await dbConnect()
    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return { success: false, error: "bookings.errors.invalidBookingId" }
    }

    const rawBooking = await Booking.findById(bookingId)
      .populate<{ treatmentId: ITreatment | null }>({
        path: "treatmentId",
        select: "name durations defaultDurationMinutes pricingType",
        populate: { path: "durations" },
      })
      .populate<{ addressId: Pick<IAddress, "_id" | "fullAddress" | "city" | "street" | "streetNumber"> | null }>({
        path: "addressId",
        select: "fullAddress city street streetNumber",
      })
      .populate<{ professionalId: Pick<IUser, "_id" | "name"> | null }>({
        path: "professionalId",
        select: "name",
      })
      .populate<{ userId: Pick<IUser, "_id" | "name" | "email" | "phone"> | null }>({
        // Populate client details
        path: "userId",
        select: "name email phone",
      })
      .lean()

    if (!rawBooking) {
      return { success: false, error: "bookings.errors.bookingNotFound" }
    }

    const currentProfessionalId = session.user.id
    const isAdmin = session.user.roles.includes("admin")
    const isAssignedToCurrentPro = rawBooking.professionalId?._id.toString() === currentProfessionalId

    // Construct the booking object for the professional
    const bookingForPro: BookingDetailsForProfessional = {
      ...rawBooking,
      _id: rawBooking._id as Types.ObjectId,
      status: rawBooking.status, // Ensure status is string
      treatmentId: null,
      userId: null, // Initialize, will be populated conditionally
      professionalId: rawBooking.professionalId
        ? {
            _id: rawBooking.professionalId._id as Types.ObjectId,
            name: rawBooking.professionalId.name,
          }
        : null,
      addressId: rawBooking.addressId
        ? {
            _id: rawBooking.addressId._id as Types.ObjectId,
            fullAddress: rawBooking.addressId.fullAddress,
            city: rawBooking.addressId.city,
            street: rawBooking.addressId.street,
            streetNumber: rawBooking.addressId.streetNumber,
          }
        : null,
    }

    if (rawBooking.treatmentId) {
      const treatmentDoc = rawBooking.treatmentId as ITreatment
      bookingForPro.treatmentId = {
        _id: treatmentDoc._id as Types.ObjectId,
        name: treatmentDoc.name,
        defaultDurationMinutes: treatmentDoc.defaultDurationMinutes,
      }
      if (treatmentDoc.pricingType === "duration_based" && rawBooking.selectedDurationId && treatmentDoc.durations) {
        const selectedDuration = treatmentDoc.durations.find(
          (d: ITreatmentDuration) => d._id?.toString() === rawBooking.selectedDurationId?.toString(),
        )
        if (selectedDuration) {
          bookingForPro.treatmentId.selectedDuration = selectedDuration
        }
      }
    }

    // Conditionally expose client details
    if (
      rawBooking.userId &&
      (isAssignedToCurrentPro || isAdmin || rawBooking.status === "pending_professional")
    ) {
      // For pending_professional, any professional viewing it can see client details to decide.
      // Or, if already assigned to them, or if admin is viewing.
      bookingForPro.userId = {
        _id: rawBooking.userId._id as Types.ObjectId,
        name: rawBooking.userId.name,
        email: rawBooking.userId.email,
        phone: rawBooking.userId.phone,
      }
    }

    return { success: true, booking: JSON.parse(JSON.stringify(bookingForPro)) } // Ensure plain object for client component
  } catch (error) {
    logger.error("Error fetching booking for professional view:", { bookingId, error })
    return { success: false, error: "bookings.errors.fetchBookingForProFailed" }
  }
}
