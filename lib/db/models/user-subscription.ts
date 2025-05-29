import mongoose, { Schema, type Document } from "mongoose"

export interface IUserSubscription extends Document {
  userId: mongoose.Types.ObjectId
  subscriptionId: mongoose.Types.ObjectId
  treatmentId: mongoose.Types.ObjectId
  purchaseDate: Date
  expiryDate: Date
  totalQuantity: number
  remainingQuantity: number
  status: "active" | "expired" | "depleted" | "cancelled"
  paymentMethodId: mongoose.Types.ObjectId
  paymentAmount: number
  createdAt: Date
  updatedAt: Date
}

const UserSubscriptionSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription", required: true },
  treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: { type: Date, required: true },
  totalQuantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
  status: {
    type: String,
    enum: ["active", "expired", "depleted", "cancelled"],
    default: "active",
  },
  paymentMethodId: { type: Schema.Types.ObjectId, ref: "PaymentMethod", required: true },
  paymentAmount: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// מידלוור לעדכון תאריך עדכון
UserSubscriptionSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

// אינדקסים
UserSubscriptionSchema.index({ userId: 1 })
UserSubscriptionSchema.index({ subscriptionId: 1 })
UserSubscriptionSchema.index({ treatmentId: 1 })
UserSubscriptionSchema.index({ status: 1 })
UserSubscriptionSchema.index({ expiryDate: 1 })

export default mongoose.models.UserSubscription ||
  mongoose.model<IUserSubscription>("UserSubscription", UserSubscriptionSchema)
