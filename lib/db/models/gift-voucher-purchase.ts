import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IGiftVoucherPurchase extends Document {
  userId: mongoose.Types.ObjectId
  status: "abandoned_pending_payment" | "completed"
  formState: {
    currentStep: number
    guestInfo?: any
    purchaseOptions?: {
      voucherType?: "treatment" | "monetary"
      treatmentId?: string
      selectedDurationId?: string
      monetaryValue?: number
      isGift?: boolean
    }
    savedAt: Date
  }
  createdAt: Date
  updatedAt: Date
}

const GiftVoucherPurchaseSchema = new Schema<IGiftVoucherPurchase>(
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
  { timestamps: true }
)

const GiftVoucherPurchase: Model<IGiftVoucherPurchase> =
  mongoose.models.GiftVoucherPurchase ||
  mongoose.model<IGiftVoucherPurchase>("GiftVoucherPurchase", GiftVoucherPurchaseSchema)

export default GiftVoucherPurchase
