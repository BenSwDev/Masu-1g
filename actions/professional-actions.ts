"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import User from "@/lib/db/models/user"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import Treatment from "@/lib/db/models/treatment"
import City from "@/lib/db/models/city"
import CityDistance from "@/lib/db/models/city-distance"
import Booking from "@/lib/db/models/booking"
import mongoose from "mongoose"

export async function getProfessionals(page = 1, limit = 10, searchTerm = "", status = "") {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, professionals: [], totalPages: 0 }
    }

    await dbConnect()

    const query: any = { roles: "professional" }
    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { phone: { $regex: searchTerm, $options: "i" } },
      ]
    }

    const skip = (page - 1) * limit
    
    // Get users with professional role
    const users = await User.find(query)
      .select("name email phone gender roles createdAt")
      .skip(skip)
      .limit(limit)
      .lean()

    // Get professional profiles for these users
    const userIds = users.map(u => u._id)
    const profiles = await ProfessionalProfile.find({ userId: { $in: userIds } })
      .populate("treatments.treatmentId", "name category")
      .populate("workAreas.cityId", "name")
      .lean()

    // Filter by professional status if specified
    let filteredProfiles = profiles
    if (status) {
      filteredProfiles = profiles.filter(p => p.status === status)
    }

    // Combine user data with professional profiles
    const professionals = users.map(user => {
      const profile = profiles.find(p => p.userId.toString() === user._id.toString())
      return {
        ...user,
        id: user._id.toString(),
        professionalProfile: profile ? {
          ...profile,
          id: profile._id.toString(),
          treatments: profile.treatments.map(t => ({
            ...t,
            id: t._id.toString(),
            treatmentId: t.treatmentId._id.toString(),
            treatmentName: t.treatmentId.name,
            treatmentCategory: t.treatmentId.category,
          })),
          workAreas: profile.workAreas.map(w => ({
            ...w,
            id: w._id.toString(),
            cityId: w.cityId._id.toString(),
            cityName: w.cityId.name,
          })),
        } : null,
      }
    }).filter(p => !status || (p.professionalProfile && p.professionalProfile.status === status))

    const total = await User.countDocuments(query)
    
    return {
      success: true,
      professionals,
      totalPages: Math.ceil(total / limit),
    }
  } catch (err) {
    console.error("Error in getProfessionals:", err)
    return { success: false, professionals: [], totalPages: 0 }
  }
}

function generateNumber() {
  return Math.floor(1000 + Math.random() * 9000).toString()
}

async function getUniqueProfessionalNumber() {
  let num = generateNumber()
  let exists = await ProfessionalProfile.findOne({ professionalNumber: num }).lean()
  while (exists) {
    num = generateNumber()
    exists = await ProfessionalProfile.findOne({ professionalNumber: num }).lean()
  }
  return num
}

export async function createProfessional(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }
    await dbConnect()
    const userId = formData.get("userId") as string | null
    const name = formData.get("name") as string | null
    const email = formData.get("email") as string | null
    const phone = formData.get("phone") as string | null
    const password = formData.get("password") as string | null
    let user
    if (userId) {
      user = await User.findById(userId)
      if (!user) return { success: false, message: "userNotFound" }
    } else {
      if (!name || !email || !phone || !password) {
        return { success: false, message: "missingFields" }
      }
      const hashed = await bcrypt.hash(password, 10)
      user = new User({
        name,
        email: email.toLowerCase(),
        phone,
        password: hashed,
        roles: ["professional"],
        activeRole: "professional",
        emailVerified: new Date(),
        phoneVerified: new Date(),
      })
      await user.save()
    }
    if (!user.roles.includes("professional")) {
      user.roles.push("professional")
    }
    user.activeRole = "professional"
    await user.save()
    const profNumber = await getUniqueProfessionalNumber()
    const profile = new ProfessionalProfile({
      userId: user._id,
      professionalNumber: profNumber,
      status: "pending" as ProfessionalStatus,
    })
    await profile.save()
    return { success: true, professionalId: user._id.toString() }
  } catch (err) {
    console.error("Error in createProfessional:", err)
    return { success: false, message: "creationFailed" }
  }
}

export async function getProfessionalById(professionalId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }
    await dbConnect()
    const user = await User.findById(professionalId).lean()
    if (!user || !user.roles.includes("professional")) {
      return { success: false, message: "notFound" }
    }
    const profile = await ProfessionalProfile.findOne({ userId: user._id }).lean()
    return {
      success: true,
      professional: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        professionalNumber: profile?.professionalNumber || "",
        status: (profile?.status as ProfessionalStatus) || "pending",
      },
    }
  } catch (err) {
    console.error("Error in getProfessionalById:", err)
    return { success: false, message: "fetchFailed" }
  }
}

export async function updateProfessionalStatus(professionalId: string, status: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const profile = await ProfessionalProfile.findOneAndUpdate(
      { userId: professionalId },
      { status },
      { new: true }
    )

    if (!profile) {
      return { success: false, message: "notFound" }
    }

    return { success: true, professionalId: profile._id.toString() }
  } catch (err) {
    console.error("Error in updateProfessionalStatus:", err)
    return { success: false, message: "updateFailed" }
  }
}

export async function findSuitableProfessionals(bookingId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, professionals: [] }
    }

    await dbConnect()

    // Get booking details
    const booking = await Booking.findById(bookingId)
      .populate("treatmentId")
      .populate("bookingAddressSnapshot")
      .lean()

    if (!booking) {
      return { success: false, message: "bookingNotFound", professionals: [] }
    }

    // Find city for the booking address
    const bookingCity = await City.findOne({ 
      name: booking.bookingAddressSnapshot?.city 
    }).lean()

    if (!bookingCity) {
      return { success: false, message: "cityNotFound", professionals: [] }
    }

    // Find all active professionals
    const activeProfessionals = await ProfessionalProfile.find({ 
      status: "active" 
    })
    .populate({
      path: "userId",
      select: "name email phone gender",
    })
    .populate("treatments.treatmentId")
    .populate("workAreas.cityId")
    .lean()

    const suitableProfessionals = []

    for (const professional of activeProfessionals) {
      // Check gender preference
      if (booking.therapistGenderPreference !== "any" && 
          professional.userId.gender !== booking.therapistGenderPreference) {
        continue
      }

      // Check if professional offers the required treatment
      const hasRequiredTreatment = professional.treatments.some(t => 
        t.treatmentId._id.toString() === booking.treatmentId._id.toString() &&
        t.isActive &&
        (!booking.selectedDurationId || t.durationId?.toString() === booking.selectedDurationId.toString())
      )

      if (!hasRequiredTreatment) {
        continue
      }

      // Check work area coverage
      let canServeLocation = false
      for (const workArea of professional.workAreas) {
        if (workArea.maxDistanceKm === 0) {
          // Unlimited range
          canServeLocation = true
          break
        }

        // Check if booking city is in covered cities
        if (workArea.coveredCities.some(cityId => 
          cityId.toString() === bookingCity._id.toString()
        )) {
          canServeLocation = true
          break
        }
      }

      if (!canServeLocation) {
        continue
      }

      // Get professional's price for this treatment
      const treatmentPrice = professional.treatments.find(t => 
        t.treatmentId._id.toString() === booking.treatmentId._id.toString() &&
        (!booking.selectedDurationId || t.durationId?.toString() === booking.selectedDurationId.toString())
      )?.professionalPrice || 0

      suitableProfessionals.push({
        id: professional._id.toString(),
        userId: professional.userId._id.toString(),
        name: professional.userId.name,
        email: professional.userId.email,
        phone: professional.userId.phone,
        gender: professional.userId.gender,
        professionalNumber: professional.professionalNumber,
        treatmentPrice,
        totalEarnings: professional.totalEarnings,
      })
    }

    return {
      success: true,
      professionals: suitableProfessionals,
      bookingDetails: {
        id: booking._id.toString(),
        bookingNumber: booking.bookingNumber,
        treatmentName: booking.treatmentId.name,
        city: booking.bookingAddressSnapshot?.city,
        therapistGenderPreference: booking.therapistGenderPreference,
      }
    }
  } catch (err) {
    console.error("Error in findSuitableProfessionals:", err)
    return { success: false, message: "searchFailed", professionals: [] }
  }
}

export async function assignProfessionalToBooking(bookingId: string, professionalId: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    // Update booking with assigned professional and change status
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { 
        professionalId: new mongoose.Types.ObjectId(professionalId),
        status: "confirmed_professional_assigned"
      },
      { new: true }
    )

    if (!booking) {
      return { success: false, message: "bookingNotFound" }
    }

    // TODO: Send SMS notification to professional
    // TODO: Send notification to customer

    return { success: true, bookingId: booking._id.toString() }
  } catch (err) {
    console.error("Error in assignProfessionalToBooking:", err)
    return { success: false, message: "assignmentFailed" }
  }
}

