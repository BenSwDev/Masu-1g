import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IAddress extends Document {
  userId: mongoose.Types.ObjectId
  country: string
  city: string
  street: string
  streetNumber: string
  addressType: 'apartment' | 'house' | 'private' | 'office' | 'hotel' | 'other'
  
  // Specific fields based on address type
  apartmentDetails?: {
    floor: number
    apartmentNumber: string
    entrance?: string
  }
  houseDetails?: {
    doorName: string
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
    addressType: {
      type: String,
      enum: ['apartment', 'house', 'private', 'office', 'hotel', 'other'],
      required: true,
    },
    apartmentDetails: {
      floor: Number,
      apartmentNumber: String,
      entrance: String,
    },
    houseDetails: {
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
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Create indexes
AddressSchema.index({ userId: 1 })
AddressSchema.index({ userId: 1, isDefault: 1 })
AddressSchema.index({ createdAt: -1 })

const Address: Model<IAddress> = mongoose.models.Address || mongoose.model<IAddress>("Address", AddressSchema)

export default Address
