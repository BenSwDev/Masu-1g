import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface ISubscriptionPurchase extends Document {
  userId: mongoose.Types.ObjectId
  status: "abandoned_pending_payment" | "completed"
  formState: {
    currentStep: number
    guestInfo?: any
    purchaseOptions?: {
      selectedSubscriptionId?: string
      selectedTreatmentId?: string
      selectedDurationId?: string
    }
    savedAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

const SubscriptionPurchaseSchema = new Schema<ISubscriptionPurchase>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    status: {
      type: String,
      enum: ["abandoned_pending_payment", "completed"],
      default: "abandoned_pending_payment",
      index: true,
    },
    formState: {
      currentStep: { type: Number, required: true },
      guestInfo: { type: Schema.Types.Mixed },
      purchaseOptions: { type: Schema.Types.Mixed },
      savedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true },
)

const SubscriptionPurchase: Model<ISubscriptionPurchase> =
  mongoose.models.SubscriptionPurchase ||
  mongoose.model<ISubscriptionPurchase>("SubscriptionPurchase", SubscriptionPurchaseSchema)

export default SubscriptionPurchase
