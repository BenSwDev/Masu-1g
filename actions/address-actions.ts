"use server"

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { logger } from "@/lib/logs/logger"
import AddressQueries from "@/lib/db/queries/address-queries"
import { IAddress } from "@/lib/db/models/address"

// Validation schemas
const addressBaseSchema = z.object({
  street: z.string().min(1, "Street is required"),
  streetNumber: z.string().min(1, "Street number is required"),
  city: z.string().min(1, "City is required"),
  addressType: z.enum(["apartment", "house", "private", "office", "hotel", "other"]),
  hasPrivateParking: z.boolean(),
  additionalNotes: z.string().optional(),
  isDefault: z.boolean(),
})

const apartmentSchema = addressBaseSchema.extend({
  addressType: z.literal("apartment"),
  apartmentDetails: z.object({
    floor: z.number().min(0),
    apartmentNumber: z.string().min(1),
    entrance: z.string().optional(),
  }),
})

const houseSchema = addressBaseSchema.extend({
  addressType: z.literal("house"),
  houseDetails: z.object({
    doorName: z.string().min(1),
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
    hotelName: z.string().min(1),
    roomNumber: z.string().min(1),
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
  officeSchema,
  hotelSchema,
  otherSchema,
])

// Helper to convert address doc to plain object with string fields
function addressToPlain(address: any) {
  if (!address) return null;
  const obj = address.toObject ? address.toObject() : address;
  return {
    ...obj,
    _id: obj._id?.toString?.() ?? obj._id,
    userId: obj.userId?.toString?.() ?? obj.userId,
    createdAt: obj.createdAt?.toISOString?.() ?? obj.createdAt,
    updatedAt: obj.updatedAt?.toISOString?.() ?? obj.updatedAt,
    // Convert nested fields if needed
    apartmentDetails: obj.apartmentDetails ? { ...obj.apartmentDetails } : undefined,
    houseDetails: obj.houseDetails ? { ...obj.houseDetails } : undefined,
    officeDetails: obj.officeDetails ? { ...obj.officeDetails } : undefined,
    hotelDetails: obj.hotelDetails ? { ...obj.hotelDetails } : undefined,
    otherDetails: obj.otherDetails ? { ...obj.otherDetails } : undefined,
    // Remove country if not needed
    // country: undefined,
  };
}

// Get user addresses
export async function getUserAddresses() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      throw new Error("Unauthorized")
    }

    const addresses = await AddressQueries.getUserAddresses(session.user.id)
    // Convert all to plain objects
    const plainAddresses = addresses.map(addressToPlain)
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

    // Validate data
    const validatedData = addressSchema.parse(data)

    // Create address
    const address = await AddressQueries.createAddress({
      ...validatedData,
      userId: session.user.id,
      country: "ישראל", // Default country
    })

    revalidatePath("/dashboard/member/addresses")
    return { success: true, address: addressToPlain(address) }
  } catch (error) {
    logger.error("Error creating address:", error)
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => e.message).join(" | ")
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

    // Validate data
    const validatedData = addressSchema.parse(data)

    // Update address
    const address = await AddressQueries.updateAddress(id, session.user.id, validatedData)

    revalidatePath("/dashboard/member/addresses")
    return { success: true, address: addressToPlain(address) }
  } catch (error) {
    logger.error("Error updating address:", error)
    if (error instanceof z.ZodError) {
      const msg = error.errors.map(e => e.message).join(" | ")
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

    revalidatePath("/dashboard/member/addresses")
    return { success: true, address }
  } catch (error) {
    logger.error("Error setting default address:", error)
    return { success: false, error: "Failed to set default address" }
  }
} 