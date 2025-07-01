import { BookingStatus } from '@/lib/db/models/booking';
"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { connectDB } from "@/lib/db/mongoose"
import { City, CityDistance } from "@/lib/db/models/city-distance"
import { revalidatePath } from "next/cache"
import { clearCitiesCache } from "@/lib/validation/city-validation"

// Helper function to require admin authentication
async function requireAdminAuth() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || !session.user.roles?.includes("admin")) {
    throw new Error("Unauthorized: Admin access required")
  }
}

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

    await connectDB()

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
      cities: cities.map(c => ({
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
    // Authorize admin
    await requireAdminAuth()

    // Connect to database
    await connectDB()

    // Get form data
    const name = formData.get("name")?.toString?.() || ''?.trim()
    const lat = formData.get("lat")?.toString?.() || ''
    const lng = formData.get("lng")?.toString?.() || ''
    const isActive = formData.get("isActive") === "true"

    // Validate required fields
    if (!name || !lat || !lng) {
      return { success: false, message: "missingFields" }
    }

    // Parse coordinates
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)

    if (isNaN(latitude) || isNaN(longitude)) {
      return { success: false, message: "invalidCoordinates" }
    }

    // Validate coordinates are within Israel bounds (rough approximation)
    if (latitude < 29.0 || latitude > 33.5 || longitude < 34.0 || longitude > 36.0) {
      return { success: false, message: "coordinatesOutOfBounds" }
    }

    // Check if city already exists
    const existingCity = await City.findOne({
      name: { $regex: new RegExp(`^${name}$`, "i") },
    })

    if (existingCity) {
      return { success: false, message: "cityExists" }
    }

    // Create new city
    const city = new City({
      name,
      coordinates: {
        lat: latitude,
        lng: longitude,
      },
      isActive,
    })

    await city.save()

    // Calculate distances to all other cities
    await City.calculateDistancesForNewCity(city._id.toString?.() || '')

    // Clear cities cache since we added a new city
    clearCitiesCache()

    // Revalidate the cities page
    revalidatePath("/dashboard/admin/cities")

    return { success: true, cityId: city._id.toString?.() || '' }
  } catch (error) {
    console.error("Error creating city:", error)
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
    // Authorize admin
    await requireAdminAuth()

    // Connect to database
    await connectDB()

    // Validate cityId
    if (!cityId) {
      return { success: false, message: "invalidCityId" }
    }

    // Get form data
    const name = formData.get("name")?.toString?.() || ''?.trim()
    const lat = formData.get("lat")?.toString?.() || ''
    const lng = formData.get("lng")?.toString?.() || ''
    const isActive = formData.get("isActive") === "true"

    // Validate required fields
    if (!name || !lat || !lng) {
      return { success: false, message: "missingFields" }
    }

    // Parse coordinates
    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)

    if (isNaN(latitude) || isNaN(longitude)) {
      return { success: false, message: "invalidCoordinates" }
    }

    // Validate coordinates are within Israel bounds
    if (latitude < 29.0 || latitude > 33.5 || longitude < 34.0 || longitude > 36.0) {
      return { success: false, message: "coordinatesOutOfBounds" }
    }

    // Check if another city with the same name exists (excluding current city)
    const existingCity = await City.findOne({
      _id: { $ne: cityId },
      name: { $regex: new RegExp(`^${name}$`, "i") },
    })

    if (existingCity) {
      return { success: false, message: "cityExists" }
    }

    // Update city
    const updatedCity = await City.findByIdAndUpdate(
      cityId,
      {
        name,
        coordinates: {
          lat: latitude,
          lng: longitude,
        },
        isActive,
      },
      { new: true, runValidators: true }
    )

    if (!updatedCity) {
      return { success: false, message: "cityNotFound" }
    }

    // If coordinates changed, recalculate distances
    const originalCity = await City.findById(cityId)
    if (
      originalCity &&
      (originalCity.coordinates.lat !== latitude || originalCity.coordinates.lng !== longitude)
    ) {
      // Remove old distances
      await CityDistance.deleteMany({
        $or: [{ fromCityId: cityId }, { toCityId: cityId }],
      })

      // Recalculate distances
      await City.calculateDistancesForNewCity(cityId)
    }

    // Clear cities cache since we updated a city
    clearCitiesCache()

    // Revalidate the cities page
    revalidatePath("/dashboard/admin/cities")

    return { success: true }
  } catch (error) {
    console.error("Error updating city:", error)
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
    // Authorize admin
    await requireAdminAuth()

    // Connect to database
    await connectDB()

    // Validate cityId
    if (!cityId) {
      return { success: false, message: "invalidCityId" }
    }

    // Check if city exists
    const city = await City.findById(cityId)
    if (!city) {
      return { success: false, message: "cityNotFound" }
    }

    // TODO: Check if city is being used in any bookings, addresses, or professional work areas
    // For now, we'll allow deletion but this should be implemented

    // Delete all distance relationships for this city
    await CityDistance.deleteMany({
      $or: [{ fromCityId: cityId }, { toCityId: cityId }],
    })

    // Delete the city
    await City.findByIdAndDelete(cityId)

    // Clear cities cache since we deleted a city
    clearCitiesCache()

    // Revalidate the cities page
    revalidatePath("/dashboard/admin/cities")

    return { success: true }
  } catch (error) {
    console.error("Error deleting city:", error)
    return { success: false, message: "deleteFailed" }
  }
}

/**
 * Toggles a city's active status
 */
export async function toggleCityStatus(cityId: string): Promise<CityActionResponse> {
  try {
    // Authorize admin
    await requireAdminAuth()

    // Connect to database
    await connectDB()

    // Validate cityId
    if (!cityId) {
      return { success: false, message: "invalidCityId" }
    }

    // Find city and toggle status
    const city = await City.findById(cityId)
    if (!city) {
      return { success: false, message: "cityNotFound" }
    }

    city.isActive = !city.isActive
    await city.save()

    // Clear cities cache since we changed status
    clearCitiesCache()

    // Revalidate the cities page
    revalidatePath("/dashboard/admin/cities")

    return { success: true }
  } catch (error) {
    console.error("Error toggling city status:", error)
    return { success: false, message: "statusToggleFailed" }
  }
}

