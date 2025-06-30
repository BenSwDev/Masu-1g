import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId
  country: string
  city: string
  street: string
  streetNumber: string
  fullAddress: string // Added fullAddress field
  addressType: "apartment" | "house" | "private" | "office" | "hotel" | "other"

  // Specific fields based on address type
  apartmentDetails?: {
    floor: number
    apartmentNumber: string
    entrance?: string
  }
  houseDetails?: {
    doorName: string // For 'private' or 'house'
    entrance?: string
  }
  officeDetails?: {
    buildingName?: string
    entrance?: string
    floor?: number
  }
  hotelDetails?: {
    hotelName: string
    roomNumber: string
  }
  otherDetails?: {
    instructions?: string
  }

  hasPrivateParking: boolean
  additionalNotes?: string
  // isDefault is not relevant for guest bookings, only for registered users
  isDefault: boolean

  createdAt: Date
  updatedAt: Date
}

const AddressSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    country: {
      type: String,
      default: "ישראל",
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    street: {
      type: String,
      required: true,
      trim: true,
    },
    streetNumber: {
      type: String,
      required: true,
    },
    fullAddress: {
      // Added fullAddress field definition
      type: String,
      required: true,
      trim: true,
    },
    addressType: {
      type: String,
      enum: ["apartment", "house", "private", "office", "hotel", "other"],
      required: true,
    },
    apartmentDetails: {
      floor: Number,
      apartmentNumber: String,
      entrance: String,
    },
    houseDetails: {
      // Renamed from privateDetails for clarity if it was meant for house/private
      doorName: String,
      entrance: String,
    },
    officeDetails: {
      buildingName: String,
      entrance: String,
      floor: Number,
    },
    hotelDetails: {
      hotelName: String,
      roomNumber: String,
    },
    otherDetails: {
      instructions: String,
    },
    hasPrivateParking: {
      type: Boolean,
      default: false,
    },
    additionalNotes: {
      type: String,
      trim: true,
    },
    // isDefault is not relevant for guest bookings, only for registered users
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Helper function to construct fullAddress
// This can be called before saving or updating an address
export function constructFullAddress(data: Partial<IAddress> | any): string {
  const parts: string[] = []
  if (data.street) parts.push(data.street)
  if (data.streetNumber) parts.push(data.streetNumber)

  if (
    data.addressType === "apartment" &&
    (data.apartmentDetails?.apartmentNumber || data.apartment)
  ) {
    const apartmentNumber = data.apartmentDetails?.apartmentNumber || data.apartment
    parts.push(`דירה ${apartmentNumber}`)
    const floor = data.apartmentDetails?.floor || data.floor
    if (floor !== undefined && floor !== null && floor !== "") {
      parts.push(`קומה ${floor}`)
    }
    const entrance = data.apartmentDetails?.entrance || data.entrance
    if (entrance) {
      parts.push(`כניסה ${entrance}`)
    }
  } else if (
    (data.addressType === "house" || data.addressType === "private") &&
    (data.houseDetails?.doorName || data.doorName)
  ) {
    const doorName = data.houseDetails?.doorName || data.doorName
    parts.push(doorName)
    const entrance = data.houseDetails?.entrance || data.entrance
    if (entrance) {
      parts.push(`כניסה ${entrance}`)
    }
  } else if (data.addressType === "office") {
    const buildingName = data.officeDetails?.buildingName || data.buildingName
    if (buildingName) parts.push(buildingName)
    const floor = data.officeDetails?.floor || data.floor
    if (floor !== undefined && floor !== null && floor !== "") {
      parts.push(`קומה ${floor}`)
    }
    const entrance = data.officeDetails?.entrance || data.entrance
    if (entrance) parts.push(`כניסה ${entrance}`)
  } else if (data.addressType === "hotel" && (data.hotelDetails?.hotelName || data.hotelName)) {
    const hotelName = data.hotelDetails?.hotelName || data.hotelName
    parts.push(hotelName)
    const roomNumber = data.hotelDetails?.roomNumber || data.roomNumber
    if (roomNumber) parts.push(`חדר ${roomNumber}`)
  } else if (
    data.addressType === "other" &&
    (data.otherDetails?.instructions || data.otherInstructions)
  ) {
    const instructions = data.otherDetails?.instructions || data.otherInstructions
    if (instructions) parts.push(instructions)
  }

  if (data.city) parts.push(data.city)
  // if (data.country) parts.push(data.country); // Country might be too verbose for a typical fullAddress string

  return parts.filter(Boolean).join(", ")
}

// Pre-save hook to automatically generate fullAddress
AddressSchema.pre<IAddress>("save", function (next: () => void) {
  if (
    this.isModified("street") ||
    this.isModified("streetNumber") ||
    this.isModified("city") ||
    this.isModified("addressType") ||
    this.isModified("apartmentDetails") ||
    this.isModified("houseDetails") ||
    this.isModified("officeDetails") ||
    this.isModified("hotelDetails")
  ) {
    this.fullAddress = constructFullAddress(this as any)
  }
  next()
})

// Create indexes
AddressSchema.index({ userId: 1, isDefault: 1 })
AddressSchema.index({ createdAt: -1 })
AddressSchema.index({ fullAddress: "text" }) // Optional: for text search on fullAddress

const Address: Model<IAddress> =
  mongoose.models.Address || mongoose.model<IAddress>("Address", AddressSchema)

export default Address
