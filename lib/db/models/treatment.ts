import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface ITreatmentDuration extends Document {
  // Added Document extension for _id
  minutes: number
  price: number
  professionalPrice: number
  isActive: boolean
  _id: mongoose.Types.ObjectId // Ensure _id is part of the interface for durations
}

export interface ITreatment extends Document {
  name: string
  category: "massages" | "facial_treatments"
  description?: string
  isActive: boolean
  pricingType: "fixed" | "duration_based"
  // For fixed pricing
  fixedPrice?: number // This will be price for a single session
  fixedProfessionalPrice?: number
  defaultDurationMinutes?: number
  // For duration-based pricing
  durations?: ITreatmentDuration[]
  allowTherapistGenderSelection?: boolean
  createdAt: Date
  updatedAt: Date
}

const TreatmentDurationSchema = new Schema<ITreatmentDuration>(
  {
    minutes: {
      type: Number,
      required: true,
      enum: [50, 60, 75, 90, 120],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    professionalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }, // Ensure _id is created for subdocuments if needed, or manage manually
)

const TreatmentSchema = new Schema<ITreatment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["massages", "facial_treatments"],
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    pricingType: {
      type: String,
      required: true,
      enum: ["fixed", "duration_based"],
    },
    fixedPrice: {
      // Price for a single session if fixed
      type: Number,
      min: 0,
      validate: {
        validator: function (this: ITreatment, value: number | undefined) {
          return this.pricingType !== "fixed" || (value != null && value >= 0)
        },
        message: "Fixed price is required for fixed pricing type.",
      },
    },
    fixedProfessionalPrice: {
      type: Number,
      min: 0,
      validate: {
        validator: function (this: ITreatment, value: number | undefined) {
          return this.pricingType !== "fixed" || (value != null && value >= 0)
        },
        message: "Fixed professional price is required for fixed pricing type.",
      },
    },
    defaultDurationMinutes: {
      type: Number,
      min: 0,
    },
    durations: [TreatmentDurationSchema],
    allowTherapistGenderSelection: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Validation to ensure proper pricing data
TreatmentSchema.pre("save", function (this: ITreatment, next) {
  if (this.pricingType === "fixed") {
    if (this.fixedPrice == null || this.fixedProfessionalPrice == null) {
      // Check for null or undefined
      return next(new Error("Fixed pricing requires both price and professional price."))
    }
    // Clear durations if fixed pricing
    this.durations = undefined
  } else if (this.pricingType === "duration_based") {
    if (!this.durations || this.durations.length === 0) {
      return next(new Error("Duration-based pricing requires at least one duration."))
    }
    // Clear fixed pricing if duration-based
    this.fixedPrice = undefined
    this.fixedProfessionalPrice = undefined
  }
  next()
})

const Treatment: Model<ITreatment> =
  mongoose.models.Treatment || mongoose.model<ITreatment>("Treatment", TreatmentSchema)

export default Treatment
