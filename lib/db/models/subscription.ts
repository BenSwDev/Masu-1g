import mongoose, { Schema, type Document } from "mongoose"

export interface ISubscription extends Document {
  name: string
  description: string
  quantity: number
  bonusQuantity: number
  validityMonths: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const SubscriptionSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  bonusQuantity: { type: Number, default: 0, min: 0 },
  validityMonths: { type: Number, required: true, min: 1 },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
})

// וירטואלים
SubscriptionSchema.virtual("totalQuantity").get(function () {
  return this.quantity + this.bonusQuantity
})

// מידלוור
SubscriptionSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

// אינדקסים
SubscriptionSchema.index({ name: 1 })
SubscriptionSchema.index({ isActive: 1 })

export default mongoose.models.Subscription ||
  mongoose.model<ISubscription>("Subscription", SubscriptionSchema)
