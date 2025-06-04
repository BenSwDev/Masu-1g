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
  }
  notes?: string
}

export interface ISpecialDate {
  name: string // הוסף שדה name שחסר
  date: Date
  isActive: boolean
  startTime: string // Format: "HH:mm"
  endTime: string // Format: "HH:mm"
  hasPriceAddition: boolean
  priceAddition?: {
    amount: number
    type: "fixed" | "percentage" // 'fixed' for ₪, 'percentage' for %
  }
  notes?: string
}

export interface IWorkingHoursSettings extends Document {
  fixedHours: IFixedHours[]
  specialDates: ISpecialDate[]
  createdAt: Date
  updatedAt: Date
}

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
  priceAddition: {
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
  },
  notes: {
    type: String,
    maxlength: 500,
    default: "",
  },
})

// אני אוסיף pre-save hook שמוודא שpriceAddition מאותחל נכון
FixedHoursSchema.pre("save", function (next) {
  if (this.isActive && !this.priceAddition) {
    this.priceAddition = { amount: 0, type: "fixed" }
  }
  if (!this.hasPriceAddition) {
    this.priceAddition = { amount: 0, type: "fixed" }
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
  priceAddition: {
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
  },
  notes: {
    type: String,
    maxlength: 500,
    default: "",
  },
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
  },
  {
    timestamps: true,
  },
)

// Pre-save hook to ensure we always have 7 days in fixedHours
WorkingHoursSettingsSchema.pre("save", function (next) {
  if (this.fixedHours.length === 0) {
    // Initialize with 7 days (Sunday = 0 to Saturday = 6)
    for (let i = 0; i < 7; i++) {
      this.fixedHours.push({
        dayOfWeek: i,
        isActive: false,
        startTime: "09:00",
        endTime: "17:00",
        hasPriceAddition: false,
        priceAddition: { amount: 0, type: "fixed" },
        notes: "",
      })
    }
  }

  // Ensure all days 0-6 exist
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
      })
    }
  }

  // Sort by dayOfWeek
  this.fixedHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek)

  next()
})

// Add index for better performance
WorkingHoursSettingsSchema.index({ createdAt: -1 })
WorkingHoursSettingsSchema.index({ "specialDates.date": 1 })

export const WorkingHoursSettings =
  mongoose.models.WorkingHoursSettings ||
  mongoose.model<IWorkingHoursSettings>("WorkingHoursSettings", WorkingHoursSettingsSchema)
