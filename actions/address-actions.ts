"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logger } from "@/lib/logs/logger"
import AddressQueries from "@/lib/db/queries/address-queries"
import { type IAddress, constructFullAddress } from "@/lib/db/models/address" // Import model and helper
import mongoose from "mongoose"
import { citySchema } from "@/lib/validation/city-validation"

// Validation schemas (ensure they align with IAddress, especially for details objects)
const addressBaseSchema = z.object({
  street: z.string().min(1, "Street is required"),
  streetNumber: z.string().min(1, "Street number is required"),
  city: citySchema, // Use the city validation schema
  addressType: z.enum(["apartment", "house", "private", "office", "hotel", "other"]),
  hasPrivateParking: z.boolean().default(false),
  additionalNotes: z.string().optional(),
  isDefault: z.boolean().default(false),
  // country is not part of the form, defaults in schema
})

const apartmentSchema = addressBaseSchema.extend({
  addressType: z.literal("apartment"),
  apartmentDetails: z.object({
    floor: z.number().min(0, "Floor cannot be negative").optional(), // Made optional to align with typical UI
    apartmentNumber: z.string().min(1, "Apartment number is required"),
    entrance: z.string().optional(),
  }),
})

const houseSchema = addressBaseSchema.extend({
  addressType: z.literal("house"), // Assuming 'private' might also use this or have its own
  houseDetails: z.object({
    doorName: z.string().min(1, "Door/House name is required"),
    entrance: z.string().optional(),
  }),
})

const privateSchema = addressBaseSchema.extend({
  addressType: z.literal("private"),
  houseDetails: z.object({
    // Re-using houseDetails for 'private' type
    doorName: z.string().min(1, "Door/House name is required"),
    entrance: z.string().optional(),
  }),
})

const officeSchema = addressBaseSchema.extend({
  addressType: z.literal("office"),
  officeDetails: z.object({
    buildingName: z.string().optional(),
    entrance: z.string().optional(),
    floor: z.number().optional(),
  }),
})

const hotelSchema = addressBaseSchema.extend({
  addressType: z.literal("hotel"),
  hotelDetails: z.object({
    hotelName: z.string().min(1, "Hotel name is required"),
    roomNumber: z.string().min(1, "Room number is required"),
  }),
})

const otherSchema = addressBaseSchema.extend({
  addressType: z.literal("other"),
  otherDetails: z.object({
    instructions: z.string().optional(),
  }),
})

const addressSchema = z.discriminatedUnion("addressType", [
  apartmentSchema,
  houseSchema,
  privateSchema,
  officeSchema,
  hotelSchema,
  otherSchema,
])

// Helper to convert address doc to plain object with string fields
function addressToPlain(address: any): IAddress | null {
  if (!address) return null
  const obj = address.toObject ? address.toObject() : { ...address } // Handle both Mongoose docs and plain objects

  // Ensure all nested detail objects are present or undefined, not null
  const plainObj: any = {
    ...obj,
    _id: obj._id?.toString?.() ?? obj._id,
    userId: obj.userId?.toString?.() ?? obj.userId,
    createdAt: obj.createdAt?.toISOString?.() ?? obj.createdAt,
    updatedAt: obj.updatedAt?.toISOString?.() ?? obj.updatedAt,
    apartmentDetails: obj.apartmentDetails ? { ...obj.apartmentDetails } : undefined,
    houseDetails: obj.houseDetails ? { ...obj.houseDetails } : undefined,
    officeDetails: obj.officeDetails ? { ...obj.officeDetails } : undefined,
    hotelDetails: obj.hotelDetails ? { ...obj.hotelDetails } : undefined,
    otherDetails: obj.otherDetails ? { ...obj.otherDetails } : undefined,
  }

  // Remove country if not needed for client, or ensure it's a string
  // delete plainObj.country;
  if (typeof plainObj.country !== "string" && plainObj.country !== undefined) {
    plainObj.country = String(plainObj.country)
  }

  return plainObj as IAddress
}

// Get user addresses
export async function getUserAddresses() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const addresses = await AddressQueries.getUserAddresses(session.user.id)
    const plainAddresses = addresses.map(addressToPlain).filter(Boolean) as IAddress[]
    return { success: true, addresses: plainAddresses }
  } catch (error) {
    logger.error("Error getting user addresses:", error)
    return { success: false, error: "Failed to get addresses" }
  }
}

// Create new address
export async function createAddress(data: z.infer<typeof addressSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const validatedData = addressSchema.parse(data)

    const fullAddress = constructFullAddress(validatedData as Partial<IAddress>)

    const addressDataWithUserAndFullAddress = {
      ...validatedData,
      userId: new mongoose.Types.ObjectId(session.user.id),
      country: "ישראל", // Default country from schema is fine, but can be explicit
      fullAddress: fullAddress, // Add the constructed fullAddress
    }

    const address = await AddressQueries.createAddress(addressDataWithUserAndFullAddress)

    revalidatePath("/dashboard/member/addresses")
    return { success: true, address: addressToPlain(address) }
  } catch (error) {
    logger.error("Error creating address:", error)
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(" | ")
      return { success: false, error: msg }
    }
    return { success: false, error: (error as Error)?.message || "Failed to create address" }
  }
}

// Update address
export async function updateAddress(id: string, data: z.infer<typeof addressSchema>) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const validatedData = addressSchema.parse(data)
    const fullAddress = constructFullAddress(validatedData as Partial<IAddress>)

    const addressDataWithFullAddress = {
      ...validatedData,
      fullAddress: fullAddress, // Add the constructed fullAddress
    }

    const address = await AddressQueries.updateAddress(
      id,
      session.user.id,
      addressDataWithFullAddress
    )

    revalidatePath("/dashboard/member/addresses")
    return { success: true, address: addressToPlain(address) }
  } catch (error) {
    logger.error("Error updating address:", error)
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(" | ")
      return { success: false, error: msg }
    }
    return { success: false, error: (error as Error)?.message || "Failed to update address" }
  }
}

// Delete address
export async function deleteAddress(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    await AddressQueries.deleteAddress(id, session.user.id)

    revalidatePath("/dashboard/member/addresses")
    return { success: true }
  } catch (error) {
    logger.error("Error deleting address:", error)
    return { success: false, error: "Failed to delete address" }
  }
}

// Set default address
export async function setDefaultAddress(id: string) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const address = await AddressQueries.setDefaultAddress(id, session.user.id)
    // The address returned from setDefaultAddress might not be a plain object yet
    // and might not have the latest fullAddress if it was part of the update logic there.
    // For consistency, re-fetch or re-plain it if necessary, or ensure setDefaultAddress returns plain.
    // Assuming AddressQueries.setDefaultAddress returns a Mongoose document:
    revalidatePath("/dashboard/member/addresses")
    return { success: true, address: addressToPlain(address) }
  } catch (error) {
    logger.error("Error setting default address:", error)
    return { success: false, error: "Failed to set default address" }
  }
}
