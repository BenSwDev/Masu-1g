import mongoose, { Schema, type Document, type Model } from "mongoose"

// Define discount types
export enum DiscountType {
  FREE_QUANTITY = "FREE_QUANTITY",
  PERCENTAGE = "PERCENTAGE",
  FIXED_AMOUNT = "FIXED_AMOUNT",
}

// Define the bundle schema
export interface IBundle extends Document {
  name: string
  description?: string
  category: string
  isActive: boolean
  quantity: number
  validityMonths: number
  treatments: {
    treatmentId: mongoose.Types.ObjectId
    name: string
  }[]
  discountType: DiscountType
  discountValue: number
  createdAt: Date
  updatedAt: Date
}

const BundleSchema = new Schema<IBundle>(
  {
    name: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    quantity: { type: Number, required: true, min: 1 },
    validityMonths: { type: Number, required: true, default: 12, min: 1 },
    treatments: [
      {
        treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
        name: { type: String, required: true },
      },
    ],
    discountType: {
      type: String,
      enum: Object.values(DiscountType),
      required: true,
      default: DiscountType.FREE_QUANTITY,
    },
    discountValue: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
)

// Ensure we don't re-compile the model if it already exists
let Bundle: Model<IBundle>

try {
  Bundle = mongoose.model<IBundle>("Bundle")
} catch {
  Bundle = mongoose.model<IBundle>("Bundle", BundleSchema)
}

export { Bundle }
export default Bundle
