import mongoose, { Schema, type Document } from "mongoose"

export interface IWorkingHours extends Document {
  _id: string
  // שעות פעילות שבועיות
  weeklyHours: {
    day: number // 0-6 (ראשון-שבת)
    isActive: boolean
    startTime: string // "09:00"
    endTime: string // "17:00"
    priceAdjustment?: {
      type: "percentage" | "fixed"
      value: number
      reason?: string
    }
  }[]

  // תאריכים מיוחדים
  specialDates: {
    date: Date
    name: string
    description?: string
    isActive: boolean
    startTime?: string
    endTime?: string
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
        startTime: String,
        endTime: String,
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

// אינדקס לתאריכים מיוחדים
WorkingHoursSchema.index({ "specialDates.date": 1 })

export const WorkingHours =
  mongoose.models.WorkingHours || mongoose.model<IWorkingHours>("WorkingHours", WorkingHoursSchema)
