import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface ITreatmentDuration {
  minutes: number
  price: number
  professionalPrice: number
  isActive: boolean
}

export interface ITreatment extends Document {
  name: string
  category: "massages" | "facial_treatments"
  description?: string
  isActive: boolean
  pricingType: "fixed" | "duration_based"
  // For fixed pricing
  fixedPrice?: number
  fixedProfessionalPrice?: number
  // For duration-based pricing
  durations?: ITreatmentDuration[]
  createdAt: Date
  updatedAt: Date
}

const TreatmentDurationSchema = new Schema<ITreatmentDuration>({
  minutes: {
    type: Number,
    required: true,
    enum: [60, 75, 90, 120],
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
})

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
      type: Number,
      min: 0,
    },
    fixedProfessionalPrice: {
      type: Number,
      min: 0,
    },
    durations: [TreatmentDurationSchema],
  },
  {
    timestamps: true,
  },
)

// Validation to ensure proper pricing data
TreatmentSchema.pre("save", function (next) {
  if (this.pricingType === "fixed") {
    if (!this.fixedPrice || !this.fixedProfessionalPrice) {
      next(new Error("Fixed pricing requires both price and professional price"))
    }
    // Clear durations if fixed pricing
    this.durations = undefined
  } else if (this.pricingType === "duration_based") {
    if (!this.durations || this.durations.length === 0) {
      next(new Error("Duration-based pricing requires at least one duration"))
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
