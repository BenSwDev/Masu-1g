import type { Types } from "mongoose"

export interface IAddress {
  _id: Types.ObjectId
  userId: Types.ObjectId
  country: string
  city: string // Note: Must be from active cities in database only
  street: string
  streetNumber: string
  fullAddress: string
  addressType: "apartment" | "house" | "private" | "office" | "hotel" | "other"
  
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
  isArchived?: boolean

  createdAt: Date
  updatedAt: Date
}
