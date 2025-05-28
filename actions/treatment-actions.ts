"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { connectDB } from "@/lib/db/mongodb"
import Treatment, { type ITreatmentDuration } from "@/lib/db/models/treatment"

export interface TreatmentFormData {
  name: string
  category: "massages" | "facial_treatments"
  description?: string
  isActive: boolean
  pricingType: "fixed" | "duration_based"
  fixedPrice?: number
  fixedProfessionalPrice?: number
  durations?: {
    minutes: number
    price: number
    professionalPrice: number
    isActive: boolean
  }[]
}

export async function getTreatments() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      throw new Error("Unauthorized")
    }

    await connectDB()
    const treatments = await Treatment.find({}).sort({ category: 1, name: 1 })

    return {
      success: true,
      treatments: JSON.parse(JSON.stringify(treatments)),
    }
  } catch (error) {
    console.error("Error fetching treatments:", error)
    return {
      success: false,
      error: "Failed to fetch treatments",
    }
  }
}

export async function createTreatment(data: TreatmentFormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      throw new Error("Unauthorized")
    }

    await connectDB()

    // Validate data before creating
    if (data.pricingType === "fixed") {
      if (!data.fixedPrice || !data.fixedProfessionalPrice) {
        throw new Error("Fixed pricing requires both price and professional price")
      }
      data.durations = undefined
    } else if (data.pricingType === "duration_based") {
      if (!data.durations || data.durations.length === 0) {
        throw new Error("Duration-based pricing requires at least one duration")
      }
      data.fixedPrice = undefined
      data.fixedProfessionalPrice = undefined
    }

    const treatment = new Treatment(data)
    await treatment.save()

    return {
      success: true,
      treatment: JSON.parse(JSON.stringify(treatment)),
    }
  } catch (error) {
    console.error("Error creating treatment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create treatment",
    }
  }
}

export async function updateTreatment(id: string, data: TreatmentFormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      throw new Error("Unauthorized")
    }

    await connectDB()

    // Validate data before updating
    if (data.pricingType === "fixed") {
      if (!data.fixedPrice || !data.fixedProfessionalPrice) {
        throw new Error("Fixed pricing requires both price and professional price")
      }
      data.durations = undefined
    } else if (data.pricingType === "duration_based") {
      if (!data.durations || data.durations.length === 0) {
        throw new Error("Duration-based pricing requires at least one duration")
      }
      data.fixedPrice = undefined
      data.fixedProfessionalPrice = undefined
    }

    const treatment = await Treatment.findByIdAndUpdate(id, data, { new: true, runValidators: true })

    if (!treatment) {
      throw new Error("Treatment not found")
    }

    return {
      success: true,
      treatment: JSON.parse(JSON.stringify(treatment)),
    }
  } catch (error) {
    console.error("Error updating treatment:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update treatment",
    }
  }
}

export async function deleteTreatment(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      throw new Error("Unauthorized")
    }

    await connectDB()

    const treatment = await Treatment.findByIdAndDelete(id)

    if (!treatment) {
      throw new Error("Treatment not found")
    }

    return {
      success: true,
    }
  } catch (error) {
    console.error("Error deleting treatment:", error)
    return {
      success: false,
      error: "Failed to delete treatment",
    }
  }
}

export async function toggleTreatmentStatus(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      throw new Error("Unauthorized")
    }

    await connectDB()

    const treatment = await Treatment.findById(id)
    if (!treatment) {
      throw new Error("Treatment not found")
    }

    treatment.isActive = !treatment.isActive
    await treatment.save()

    return {
      success: true,
      treatment: JSON.parse(JSON.stringify(treatment)),
    }
  } catch (error) {
    console.error("Error toggling treatment status:", error)
    return {
      success: false,
      error: "Failed to toggle treatment status",
    }
  }
}

export async function duplicateTreatment(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.activeRole !== "admin") {
      throw new Error("Unauthorized")
    }

    await connectDB()

    const originalTreatment = await Treatment.findById(id)
    if (!originalTreatment) {
      throw new Error("Treatment not found")
    }

    const treatmentData = originalTreatment.toObject() as {
      _id?: string;
      createdAt?: Date;
      updatedAt?: Date;
      name: string;
      [key: string]: any;
    }

    delete treatmentData._id
    delete treatmentData.createdAt
    delete treatmentData.updatedAt
    treatmentData.name = `${treatmentData.name} (עותק)`

    const newTreatment = new Treatment(treatmentData)
    await newTreatment.save()

    return {
      success: true,
      treatment: JSON.parse(JSON.stringify(newTreatment)),
    }
  } catch (error) {
    console.error("Error duplicating treatment:", error)
    return {
      success: false,
      error: "Failed to duplicate treatment",
    }
  }
}
