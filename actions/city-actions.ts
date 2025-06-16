"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { City } from "@/lib/db/models/city-distance"
import { revalidatePath } from "next/cache"

export async function getCities(page = 1, limit = 10, searchTerm = "") {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.activeRole !== "admin") {
      return { success: false, cities: [], totalPages: 0 }
    }

    await dbConnect()

    const query: any = {}
    if (searchTerm) {
      query.name = { $regex: searchTerm, $options: "i" }
    }

    const skip = (page - 1) * limit
    const [cities, total] = await Promise.all([
      City.find(query).skip(skip).limit(limit).lean(),
      City.countDocuments(query),
    ])

    return {
      success: true,
      cities: cities.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        isActive: c.isActive,
        coordinates: {
          lat: c.coordinates.lat,
          lng: c.coordinates.lng,
        },
      })),
      totalPages: Math.ceil(total / limit),
    }
  } catch (err) {
    console.error("Error in getCities:", err)
    return { success: false, cities: [], totalPages: 0 }
  }
}

export async function createCity(formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.activeRole !== "admin") {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const name = formData.get("name") as string
    const lat = parseFloat(formData.get("lat") as string)
    const lng = parseFloat(formData.get("lng") as string)
    const isActive = formData.get("isActive") === "true"

    if (!name || isNaN(lat) || isNaN(lng)) {
      return { success: false, message: "missingFields" }
    }

    // Validate coordinates are within Israel bounds (approximately)
    if (lat < 29.0 || lat > 33.5 || lng < 34.0 || lng > 36.0) {
      return { success: false, message: "coordinatesOutOfBounds" }
    }

    const existing = await City.findOne({ name }).lean()
    if (existing) {
      return { success: false, message: "cityExists" }
    }

    const city = new City({ 
      name, 
      coordinates: { lat, lng }, 
      isActive 
    })
    await city.save()

    // Calculate distances to all existing cities
    console.log("Calculating distances for new city:", name)
    await (City as any).calculateDistancesForNewCity(city._id.toString())

    revalidatePath("/dashboard/admin/cities")

    return { success: true, cityId: city._id.toString() }
  } catch (err) {
    console.error("Error in createCity:", err)
    return { success: false, message: "creationFailed" }
  }
}

export async function updateCity(cityId: string, formData: FormData) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.activeRole !== "admin") {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const name = formData.get("name") as string
    const lat = parseFloat(formData.get("lat") as string)
    const lng = parseFloat(formData.get("lng") as string)
    const isActive = formData.get("isActive") === "true"

    if (!name || isNaN(lat) || isNaN(lng)) {