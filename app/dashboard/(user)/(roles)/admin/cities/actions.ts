"use server"

import { revalidatePath } from "next/cache"
import { City, CityDistance } from "../../../../../../lib/db/models/city-distance"
import { clearCitiesCache } from "../../../../../../lib/validation/city-validation"
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
export interface CityData {
  _id: string
  name: string
  isActive: boolean
  coordinates: CityCoordinates
  createdAt?: string
  updatedAt?: string
}

/**
 * Interface for city filters
 */
export interface CityFilters extends AdminActionOptions {
  isActive?: boolean
  region?: string
}

/**
 * Interface for creating/updating cities
 */
export interface CreateCityData {
  name: string
  coordinates: CityCoordinates
  isActive: boolean
}

export interface UpdateCityData {
  name?: string
  coordinates?: CityCoordinates
  isActive?: boolean
}

/**
 * City statistics interface
 */
export interface CityStatistics {
  totalCities: number
  activeCities: number
  inactiveCities: number
  averageDistanceBetweenCities: number
  totalDistanceRecords: number
}

/**
 * Fetches a paginated list of cities with optional search and filters
 */
export async function getCities(
  filters: CityFilters = {}
): Promise<AdminActionResult<PaginatedResult<CityData>>> {
  const adminLogger = new AdminLogger("getCities")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    const { page, limit, skip } = validatePaginationOptions(filters)
    const {
      isActive,
      search,
      sortBy = "name",
      sortOrder = "asc"
    } = filters

    adminLogger.info("Fetching cities", { filters, page, limit })

    // Build query
    const query: Record<string, any> = {}

    // Search filter
    if (search) {
      const searchQuery = buildSearchQuery(search, ["name"])
      Object.assign(query, searchQuery)
    }

    // Active status filter
    if (typeof isActive === "boolean") {
      query.isActive = isActive
    }

    // Get total count
    const totalCities = await City.countDocuments(query)

    adminLogger.info("Found cities matching query", { totalCities, query })

    // Get cities with pagination and sorting
    const sortQuery = buildSortQuery(sortBy, sortOrder)
    const cities = await City.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean()

    // Process cities
    const citiesData: CityData[] = cities.map((city: any) => {
      const serialized = serializeMongoObject<any>(city)
      return {
        _id: serialized._id.toString(),
        name: serialized.name,
        isActive: serialized.isActive,
        coordinates: {
          lat: serialized.coordinates.lat,
          lng: serialized.coordinates.lng
        },
        createdAt: serialized.createdAt,
        updatedAt: serialized.updatedAt
      }
    })

    adminLogger.info("Successfully fetched cities", { count: citiesData.length })
    return createPaginatedResult(citiesData, totalCities, page, limit)
  } catch (error) {
    return handleAdminError(error, "getCities")
  }
}

/**
 * Get city by ID
 */
export async function getCityById(cityId: string): Promise<AdminActionResult<CityData>> {
  const adminLogger = new AdminLogger("getCityById")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(cityId, "מזהה עיר")
    
    adminLogger.info("Fetching city by ID", { cityId })

    const city = await City.findById(cityId).lean()

    if (!city) {
      adminLogger.warn("City not found", { cityId })
      return createErrorResult("עיר לא נמצאה")
    }

    const serialized = serializeMongoObject<any>(city)
    const cityData: CityData = {
      _id: serialized._id.toString(),
      name: serialized.name,
      isActive: serialized.isActive,
      coordinates: {
        lat: serialized.coordinates.lat,
        lng: serialized.coordinates.lng
      },
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully fetched city", { cityId })
    return createSuccessResult(cityData)
  } catch (error) {
    return handleAdminError(error, "getCityById")
  }
}

/**
 * Creates a new city
 */
export async function createCity(cityData: CreateCityData): Promise<AdminActionResult<CityData>> {
  const adminLogger = new AdminLogger("createCity")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Creating new city", { name: cityData.name })

    // Validate required fields
    if (!cityData.name?.trim()) {
      return createErrorResult("שם העיר נדרש")
    }
    if (!cityData.coordinates?.lat || !cityData.coordinates?.lng) {
      return createErrorResult("קואורדינטות נדרשות")
    }

    // Parse and validate coordinates
    const latitude = Number(cityData.coordinates.lat)
    const longitude = Number(cityData.coordinates.lng)

    if (isNaN(latitude) || isNaN(longitude)) {
      return createErrorResult("קואורדינטות לא תקינות")
    }

    // Validate coordinates are within Israel bounds (rough approximation)
    if (latitude < 29.0 || latitude > 33.5 || longitude < 34.0 || longitude > 36.0) {
      return createErrorResult("הקואורדינטות חייבות להיות בגבולות ישראל")
    }

    // Check if city already exists
    const existingCity = await City.findOne({ 
      name: { $regex: new RegExp(`^${cityData.name.trim()}$`, "i") }
    })

    if (existingCity) {
      adminLogger.warn("City already exists", { name: cityData.name })
      return createErrorResult("עיר עם שם זה כבר קיימת")
    }

    // Create new city
    const city = new City({
      name: cityData.name.trim(),
      coordinates: {
        lat: latitude,
        lng: longitude
      },
      isActive: cityData.isActive,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    await city.save()

    // Calculate distances to all other cities
    try {
      if (typeof City.calculateDistancesForNewCity === 'function') {
        await City.calculateDistancesForNewCity(city._id.toString())
      }
    } catch (distanceError) {
      adminLogger.warn("Failed to calculate distances for new city", { 
        cityId: city._id.toString(), 
        error: distanceError 
      })
      // Don't fail the creation if distance calculation fails
    }

    // Clear cities cache since we added a new city
    try {
      clearCitiesCache()
    } catch (cacheError) {
      adminLogger.warn("Failed to clear cities cache", { error: cacheError })
    }

    revalidateAdminPath("/dashboard/admin/cities")

    const serialized = serializeMongoObject<any>(city.toObject())
    const result: CityData = {
      _id: serialized._id.toString(),
      name: serialized.name,
      isActive: serialized.isActive,
      coordinates: {
        lat: serialized.coordinates.lat,
        lng: serialized.coordinates.lng
      },
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully created city", { cityId: result._id })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "createCity")
  }
}

/**
 * Updates an existing city
 */
export async function updateCity(
  cityId: string,
  cityData: UpdateCityData
): Promise<AdminActionResult<CityData>> {
  const adminLogger = new AdminLogger("updateCity")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(cityId, "מזהה עיר")
    
    adminLogger.info("Updating city", { cityId, updates: Object.keys(cityData) })

    const city = await City.findById(cityId)
    if (!city) {
      adminLogger.warn("City not found for update", { cityId })
      return createErrorResult("עיר לא נמצאה")
    }

    // Check if name is being changed and already exists
    if (cityData.name && cityData.name !== city.name) {
      const existingCity = await City.findOne({ 
        name: { $regex: new RegExp(`^${cityData.name.trim()}$`, "i") },
        _id: { $ne: cityId }
      })
      if (existingCity) {
        adminLogger.warn("City name already exists for another city", { name: cityData.name })
        return createErrorResult("שם עיר זה כבר קיים במערכת")
      }
    }

    // Validate coordinates if provided
    if (cityData.coordinates) {
      const latitude = Number(cityData.coordinates.lat)
      const longitude = Number(cityData.coordinates.lng)

      if (isNaN(latitude) || isNaN(longitude)) {
        return createErrorResult("קואורדינטות לא תקינות")
      }

      if (latitude < 29.0 || latitude > 33.5 || longitude < 34.0 || longitude > 36.0) {
        return createErrorResult("הקואורדינטות חייבות להיות בגבולות ישראל")
      }
    }

    // Update city fields
    if (cityData.name) {
      city.name = cityData.name.trim()
    }
    if (cityData.coordinates) {
      city.coordinates = {
        lat: Number(cityData.coordinates.lat),
        lng: Number(cityData.coordinates.lng)
      }
    }
    if (typeof cityData.isActive === "boolean") {
      city.isActive = cityData.isActive
    }

    city.updatedAt = new Date()
    await city.save()

    // Recalculate distances if coordinates changed
    if (cityData.coordinates) {
      try {
        if (typeof City.calculateDistancesForNewCity === 'function') {
          await City.calculateDistancesForNewCity(cityId)
        }
      } catch (distanceError) {
        adminLogger.warn("Failed to recalculate distances for updated city", { 
          cityId, 
          error: distanceError 
        })
      }
    }

    // Clear cities cache
    try {
      clearCitiesCache()
    } catch (cacheError) {
      adminLogger.warn("Failed to clear cities cache", { error: cacheError })
    }

    revalidateAdminPath("/dashboard/admin/cities")

    const serialized = serializeMongoObject<any>(city.toObject())
    const result: CityData = {
      _id: serialized._id.toString(),
      name: serialized.name,
      isActive: serialized.isActive,
      coordinates: {
        lat: serialized.coordinates.lat,
        lng: serialized.coordinates.lng
      },
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully updated city", { cityId })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "updateCity")
  }
}

/**
 * Deletes a city
 */
export async function deleteCity(cityId: string): Promise<AdminActionResult<boolean>> {
  const adminLogger = new AdminLogger("deleteCity")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(cityId, "מזהה עיר")
    
    adminLogger.info("Deleting city", { cityId })

    const city = await City.findById(cityId)
    if (!city) {
      adminLogger.warn("City not found for deletion", { cityId })
      return createErrorResult("עיר לא נמצאה")
    }

    // Check if city is being used in bookings or other entities
    // This is where you'd add business logic checks

    // Delete all distance records for this city
    try {
      await CityDistance.deleteMany({
        $or: [
          { fromCityId: new Types.ObjectId(cityId) },
          { toCityId: new Types.ObjectId(cityId) }
        ]
      })
    } catch (distanceError) {
      adminLogger.warn("Failed to delete city distances", { cityId, error: distanceError })
    }

    // Delete the city
    await City.findByIdAndDelete(cityId)

    // Clear cities cache
    try {
      clearCitiesCache()
    } catch (cacheError) {
      adminLogger.warn("Failed to clear cities cache", { error: cacheError })
    }

    revalidateAdminPath("/dashboard/admin/cities")

    adminLogger.info("Successfully deleted city", { cityId })
    return createSuccessResult(true)
  } catch (error) {
    return handleAdminError(error, "deleteCity")
  }
}

/**
 * Toggles city status (active/inactive)
 */
export async function toggleCityStatus(cityId: string): Promise<AdminActionResult<CityData>> {
  const adminLogger = new AdminLogger("toggleCityStatus")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    validateObjectId(cityId, "מזהה עיר")
    
    adminLogger.info("Toggling city status", { cityId })

    const city = await City.findById(cityId)
    if (!city) {
      adminLogger.warn("City not found for status toggle", { cityId })
      return createErrorResult("עיר לא נמצאה")
    }

    city.isActive = !city.isActive
    city.updatedAt = new Date()
    await city.save()

    // Clear cities cache
    try {
      clearCitiesCache()
    } catch (cacheError) {
      adminLogger.warn("Failed to clear cities cache", { error: cacheError })
    }

    revalidateAdminPath("/dashboard/admin/cities")

    const serialized = serializeMongoObject<any>(city.toObject())
    const result: CityData = {
      _id: serialized._id.toString(),
      name: serialized.name,
      isActive: serialized.isActive,
      coordinates: {
        lat: serialized.coordinates.lat,
        lng: serialized.coordinates.lng
      },
      createdAt: serialized.createdAt,
      updatedAt: serialized.updatedAt
    }

    adminLogger.info("Successfully toggled city status", { cityId, newStatus: city.isActive })
    return createSuccessResult(result)
  } catch (error) {
    return handleAdminError(error, "toggleCityStatus")
  }
}

/**
 * Gets city statistics
 */
export async function getCityStatistics(): Promise<AdminActionResult<CityStatistics>> {
  const adminLogger = new AdminLogger("getCityStatistics")
  
  try {
    await requireAdminSession()
    await connectToDatabase()
    
    adminLogger.info("Fetching city statistics")

    // Run all queries in parallel for better performance
    const [
      totalCities,
      activeCities,
      inactiveCities,
      averageDistanceResult,
      totalDistanceRecords
    ] = await Promise.all([
      City.countDocuments({}),
      City.countDocuments({ isActive: true }),
      City.countDocuments({ isActive: false }),
      CityDistance.aggregate([
        { $group: { _id: null, averageDistance: { $avg: "$distance" } } }
      ]),
      CityDistance.countDocuments({})
    ])

    const averageDistanceBetweenCities = averageDistanceResult[0]?.averageDistance || 0

    const statistics: CityStatistics = {
      totalCities,
      activeCities,
      inactiveCities,
      averageDistanceBetweenCities: Math.round(averageDistanceBetweenCities * 100) / 100,
      totalDistanceRecords
    }

    adminLogger.info("Successfully fetched city statistics", statistics)
    return createSuccessResult(statistics)
  } catch (error) {
    return handleAdminError(error, "getCityStatistics")
  }
}

/**
 * Legacy form-based create city (for backward compatibility)
 */
export async function createCityFromForm(formData: FormData): Promise<AdminActionResult<CityData>> {
  const name = formData.get("name")?.toString()?.trim()
  const lat = formData.get("lat")?.toString()
  const lng = formData.get("lng")?.toString()
  const isActive = formData.get("isActive") === "true"

  if (!name || !lat || !lng) {
    return createErrorResult("שדות חובה חסרים")
  }

  return createCity({
    name,
    coordinates: {
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    },
    isActive
  })
}

/**
 * Legacy form-based update city (for backward compatibility)
 */
export async function updateCityFromForm(
  cityId: string, 
  formData: FormData
): Promise<AdminActionResult<CityData>> {
  const name = formData.get("name")?.toString()?.trim()
  const lat = formData.get("lat")?.toString()
  const lng = formData.get("lng")?.toString()
  const isActive = formData.get("isActive") === "true"

  const updateData: UpdateCityData = {}

  if (name) updateData.name = name
  if (lat && lng) {
    updateData.coordinates = {
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    }
  }
  updateData.isActive = isActive

  return updateCity(cityId, updateData)
}
