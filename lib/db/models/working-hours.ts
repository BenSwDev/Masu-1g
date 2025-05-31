import mongoose, { Schema, type Document } from "mongoose"

// Interface for a single day's working hours
export interface IFixedHour {
  day: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isActive: boolean
  startTime: string // Format: "HH:mm"
  endTime: string // Format: "HH:mm"
  hasPriceOverride: boolean
  priceOverrideAmount?: number
  priceOverrideType?: "fixed" | "percentage"
  notes?: string
}

// Interface for special dates
export interface ISpecialDate {
  id: string
  date: Date
  isActive: boolean
  startTime: string // Format: "HH:mm"
  endTime: string // Format: "HH:mm"
  hasPriceOverride: boolean
  priceOverrideAmount?: number
  priceOverrideType?: "fixed" | "percentage"
  notes?: string
}

// Main interface for working hours settings
export interface IWorkingHoursSettings extends Document {
  fixedHours: IFixedHour[]
  specialDates: ISpecialDate[]
  createdAt: Date
  updatedAt: Date
}

// Schema for fixed hours
const FixedHourSchema = new Schema<IFixedHour>(
  {
    day: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String,
      required: function (this: IFixedHour) {
        return this.isActive
      },
      validate: {
        validator: (v: string) => !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
        message: "Start time must be in HH:mm format",
      },
    },
    endTime: {
      type: String,
      required: function (this: IFixedHour) {
        return this.isActive
      },
      validate: {
        validator: (v: string) => !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
        message: "End time must be in HH:mm format",
      },
    },
    hasPriceOverride: {
      type: Boolean,
      default: false,
    },
    priceOverrideAmount: {
      type: Number,
      min: 0,
      required: function (this: IFixedHour) {
        return this.hasPriceOverride
      },
    },
    priceOverrideType: {
      type: String,
      enum: ["fixed", "percentage"],
      required: function (this: IFixedHour) {
        return this.hasPriceOverride
      },
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: false },
)

// Schema for special dates
const SpecialDateSchema = new Schema<ISpecialDate>(
  {
    id: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    startTime: {
      type: String,
      required: function (this: ISpecialDate) {
        return this.isActive
      },
      validate: {
        validator: (v: string) => !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
        message: "Start time must be in HH:mm format",
      },
    },
    endTime: {
      type: String,
      required: function (this: ISpecialDate) {
        return this.isActive
      },
      validate: {
        validator: (v: string) => !v || /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
        message: "End time must be in HH:mm format",
      },
    },
    hasPriceOverride: {
      type: Boolean,
      default: false,
    },
    priceOverrideAmount: {
      type: Number,
      min: 0,
      required: function (this: ISpecialDate) {
        return this.hasPriceOverride
      },
    },
    priceOverrideType: {
      type: String,
      enum: ["fixed", "percentage"],
      required: function (this: ISpecialDate) {
        return this.hasPriceOverride
      },
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  { _id: false },
)

// Main schema for working hours settings
const WorkingHoursSettingsSchema = new Schema<IWorkingHoursSettings>(
  {
    fixedHours: {
      type: [FixedHourSchema],
      default: () => {
        // Create default fixed hours for all 7 days (Sunday=0 to Saturday=6)
        return Array.from({ length: 7 }, (_, index) => ({
          day: index,
          isActive: false,
          startTime: "09:00",
          endTime: "17:00",
          hasPriceOverride: false,
          notes: "",
        }))
      },
    },
    specialDates: {
      type: [SpecialDateSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "working_hours_settings",
  },
)

// Pre-save middleware to ensure fixedHours always has 7 days
WorkingHoursSettingsSchema.pre("save", function (next) {
  // Ensure we have exactly 7 days in fixedHours
  const existingDays = new Set(this.fixedHours.map((fh) => fh.day))

  for (let day = 0; day < 7; day++) {
    if (!existingDays.has(day)) {
      this.fixedHours.push({
        day,
        isActive: false,
        startTime: "09:00",
        endTime: "17:00",
        hasPriceOverride: false,
        notes: "",
      })
    }
  }

  // Sort by day
  this.fixedHours.sort((a, b) => a.day - b.day)

  next()
})

// Create and export the model
const WorkingHoursSettings =
  mongoose.models.WorkingHoursSettings ||
  mongoose.model<IWorkingHoursSettings>("WorkingHoursSettings", WorkingHoursSettingsSchema)

export default WorkingHoursSettings

// Export types for use in other files
export type { IFixedHour, ISpecialDate, IWorkingHoursSettings }
