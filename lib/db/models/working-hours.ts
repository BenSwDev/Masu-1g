import mongoose, { Schema, type Document, type Types } from "mongoose" // Added Types

export interface IWorkingHours extends Document {
  _id: string // Changed from Types.ObjectId to string for consistency if needed, or keep Types.ObjectId
  weeklyHours: {
    _id?: Types.ObjectId // Ensure _id is optional here if it's auto-generated and not always present
    day: number
    isActive: boolean
    startTime: string
    endTime: string
    priceAdjustment?: {
      type: "percentage" | "fixed"
      value: number
      reason?: string
    }
  }[]
  specialDates: {
    _id?: Types.ObjectId // Ensure _id is optional here
    date: Date
    name: string
    description?: string
    isActive: boolean
    startTime?: string // Made optional
    endTime?: string // Made optional
    priceAdjustment?: {
      type: "percentage" | "fixed"
      value: number
      reason?: string
    }
  }[]
  createdAt: Date
  updatedAt: Date
}

const WorkingHoursSchema = new Schema<IWorkingHours>(
  {
    weeklyHours: [
      {
        day: { type: Number, required: true, min: 0, max: 6 },
        isActive: { type: Boolean, required: true, default: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        priceAdjustment: {
          type: { type: String, enum: ["percentage", "fixed"] },
          value: { type: Number, min: 0 },
          reason: String,
        },
      },
    ],
    specialDates: [
      {
        date: { type: Date, required: true },
        name: { type: String, required: true },
        description: String,
        isActive: { type: Boolean, required: true, default: true },
        startTime: String, // Removed required: true
        endTime: String, // Removed required: true
        priceAdjustment: {
          type: { type: String, enum: ["percentage", "fixed"] },
          value: { type: Number, min: 0 },
          reason: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
)

WorkingHoursSchema.index({ "specialDates.date": 1 })

export const WorkingHours =
  mongoose.models.WorkingHours || mongoose.model<IWorkingHours>("WorkingHours", WorkingHoursSchema)
