import mongoose, { Schema, type Document } from "mongoose"

export interface IFixedHours {
  dayOfWeek: number // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  isActive: boolean
  startTime: string // Format: "HH:mm"
  endTime: string // Format: "HH:mm"
  hasPriceAddition: boolean
  priceAddition?: {
    amount: number
    type: "fixed" | "percentage" // 'fixed' for ₪, 'percentage' for %
    description?: string // Optional description for the surcharge
  }
  notes?: string
}

export interface ISpecialDate {
  name: string
  date: Date
  isActive: boolean
  startTime: string // Format: "HH:mm"
  endTime: string // Format: "HH:mm"
  hasPriceAddition: boolean
  priceAddition?: {
    amount: number
    type: "fixed" | "percentage" // 'fixed' for ₪, 'percentage' for %
    description?: string // Optional description for the surcharge
  }
  notes?: string
}

export interface IWorkingHoursSettings extends Document {
  fixedHours: IFixedHours[]
  specialDates: ISpecialDate[]
  slotIntervalMinutes?: number // Added for configuring time slot generation
  minimumBookingLeadTimeHours?: number // Added for booking lead time
  createdAt: Date
  updatedAt: Date
}

const PriceAdditionSchema = new Schema(
  {
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    type: {
      type: String,
      enum: ["fixed", "percentage"],
      default: "fixed",
    },
    description: {
      // Added description to schema
      type: String,
      maxlength: 100,
    },
  },
  { _id: false },
)

const FixedHoursSchema = new Schema<IFixedHours>({
  dayOfWeek: {
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
    default: "09:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "Start time must be in HH:mm format",
    },
  },
  endTime: {
    type: String,
    default: "17:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "End time must be in HH:mm format",
    },
  },
  hasPriceAddition: {
    type: Boolean,
    default: false,
  },
  priceAddition: PriceAdditionSchema, // Used the sub-schema
  notes: {
    type: String,
    maxlength: 500,
    default: "",
  },
})

FixedHoursSchema.pre("save", function (next) {
  if (this.isActive && !this.priceAddition) {
    this.priceAddition = { amount: 0, type: "fixed" }
  }
  if (!this.hasPriceAddition) {
    this.priceAddition = { amount: 0, type: "fixed" }
  } else if (this.hasPriceAddition && this.priceAddition && this.priceAddition.amount === 0) {
    // If hasPriceAddition is true but amount is 0, maybe it should be false?
    // Or ensure description is set if amount > 0. For now, just ensure object exists.
  }
  next()
})

const SpecialDateSchema = new Schema<ISpecialDate>({
  name: {
    type: String,
    required: true,
    maxlength: 100,
  },
  date: {
    type: Date,
    required: true,
    // index: true, // Removed inline index to avoid duplication
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  startTime: {
    type: String,
    default: "09:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "Start time must be in HH:mm format",
    },
  },
  endTime: {
    type: String,
    default: "17:00",
    validate: {
      validator: (v: string) => /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v),
      message: "End time must be in HH:mm format",
    },
  },
  hasPriceAddition: {
    type: Boolean,
    default: false,
  },
  priceAddition: PriceAdditionSchema, // Used the sub-schema
  notes: {
    type: String,
    maxlength: 500,
    default: "",
  },
})

SpecialDateSchema.pre("save", function (next) {
  if (!this.priceAddition) {
    this.priceAddition = { amount: 0, type: "fixed" }
  }
  if (!this.hasPriceAddition) {
    this.priceAddition = { amount: 0, type: "fixed" }
  }
  next()
})

const WorkingHoursSettingsSchema = new Schema<IWorkingHoursSettings>(
  {
    fixedHours: {
      type: [FixedHoursSchema],
      default: [],
      validate: {
        validator: (v: IFixedHours[]) => v.length === 7,
        message: "Fixed hours must contain exactly 7 days",
      },
    },
    specialDates: {
      type: [SpecialDateSchema],
      default: [],
    },
    slotIntervalMinutes: {
      // Added field
      type: Number,
      default: 30,
      min: 5,
      max: 120,
    },
    minimumBookingLeadTimeHours: {
      // Added field
      type: Number,
      default: 2,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

WorkingHoursSettingsSchema.pre("save", function (next) {
  if (this.isNew && this.fixedHours.length === 0) {
    // Only initialize if new and empty
    for (let i = 0; i < 7; i++) {
      this.fixedHours.push({
        dayOfWeek: i,
        isActive: false, // Default to inactive
        startTime: "09:00",
        endTime: "17:00",
        hasPriceAddition: false,
        priceAddition: { amount: 0, type: "fixed" },
        notes: "",
      } as IFixedHours) // Cast to IFixedHours
    }
  } else if (this.fixedHours.length > 0) {
    // Ensure all days 0-6 exist if not new or not empty
    for (let i = 0; i < 7; i++) {
      const existingDay = this.fixedHours.find((day) => day.dayOfWeek === i)
      if (!existingDay) {
        this.fixedHours.push({
          dayOfWeek: i,
          isActive: false,
          startTime: "09:00",
          endTime: "17:00",
          hasPriceAddition: false,
          priceAddition: { amount: 0, type: "fixed" },
          notes: "",
        } as IFixedHours)
      }
    }
  }

  this.fixedHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  const dates = this.specialDates.map((sd) => sd.date.toISOString().split("T")[0])
  const uniqueDates = [...new Set(dates)]
  if (dates.length !== uniqueDates.length) {
    return next(new Error("Duplicate special dates are not allowed"))
  }

  next()
})

WorkingHoursSettingsSchema.index({ createdAt: -1 })
WorkingHoursSettingsSchema.index({ "specialDates.date": 1 }) // This is the correct way to index array sub-documents

export const WorkingHoursSettings =
  mongoose.models.WorkingHoursSettings ||
  mongoose.model<IWorkingHoursSettings>("WorkingHoursSettings", WorkingHoursSettingsSchema)
