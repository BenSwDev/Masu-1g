"use server"

import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import { City, CityDistance } from "@/lib/db/models/city-distance"
import { revalidatePath } from "next/cache"

/**
 * Interface for city coordinates
 */
interface CityCoordinates {
  lat: number
  lng: number
}

/**
 * Interface for city data
 */
interface CityData {
  id: string
  name: string
  isActive: boolean
  coordinates: CityCoordinates
}

/**
 * Interface for getCities response
 */
interface GetCitiesResponse {
  success: boolean
  cities: CityData[]
  totalPages: number
}

/**
 * Interface for city action response
 */
interface CityActionResponse {
  success: boolean
  message?: string
  cityId?: string
}

/**
 * Fetches a paginated list of cities with optional search
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 10)
 * @param searchTerm - Optional search term for city name
 * @returns Promise<GetCitiesResponse>
 */
export async function getCities(page = 1, limit = 10, searchTerm = ""): Promise<GetCitiesResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles?.includes("admin")) {
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
        id: String(c._id),
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

/**
 * Creates a new city
 * @param formData - Form data containing city details
 * @returns Promise<CityActionResponse>
 */
export async function createCity(formData: FormData): Promise<CityActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles?.includes("admin")) {
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

/**
 * Updates an existing city
 * @param cityId - ID of the city to update
 * @param formData - Form data containing updated city details
 * @returns Promise<CityActionResponse>
 */
export async function updateCity(cityId: string, formData: FormData): Promise<CityActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles?.includes("admin")) {
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

    const city = await City.findById(cityId)
    if (!city) {
      return { success: false, message: "cityNotFound" }
    }

    // Check if another city with the same name exists (excluding current)
    const existing = await City.findOne({ 
      name, 
      _id: { $ne: cityId } 
    }).lean()
    if (existing) {
      return { success: false, message: "cityExists" }
    }

    // Check if coordinates changed to decide if we need to recalculate distances
    const coordsChanged = city.coordinates.lat !== lat || city.coordinates.lng !== lng

    city.name = name
    city.coordinates = { lat, lng }
    city.isActive = isActive
    await city.save()

    // Recalculate distances if coordinates changed
    if (coordsChanged) {
      console.log("Recalculating distances for updated city:", name)
      await (City as any).calculateDistancesForNewCity(cityId)
    }

    revalidatePath("/dashboard/admin/cities")

    return { success: true }
  } catch (err) {
    console.error("Error in updateCity:", err)
    return { success: false, message: "updateFailed" }
  }
}

/**
 * Deletes a city and its associated distance records
 * @param cityId - ID of the city to delete
 * @returns Promise<CityActionResponse>
 */
export async function deleteCity(cityId: string): Promise<CityActionResponse> {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session.user.roles?.includes("admin")) {
      return { success: false, message: "notAuthorized" }
    }

    await dbConnect()

    const city = await City.findById(cityId)
    if (!city) {
      return { success: false, message: "cityNotFound" }
    }

    // Delete the city
    await City.findByIdAndDelete(cityId)

    // Clean up distance records
    await CityDistance.deleteMany({
      $or: [
        { fromCityId: cityId },
        { toCityId: cityId }
      ]
    })

    revalidatePath("/dashboard/admin/cities")

    return { success: true }
  } catch (err) {
    console.error("Error in deleteCity:", err)
    return { success: false, message: "deleteFailed" }
  }
} 