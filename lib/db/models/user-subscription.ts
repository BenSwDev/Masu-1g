import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IUserSubscription extends Document {
  userId: mongoose.Types.ObjectId
  subscriptionId: mongoose.Types.ObjectId // Ref to Subscription model
  treatmentId: mongoose.Types.ObjectId // Ref to Treatment model
  selectedDurationId?: mongoose.Types.ObjectId // Ref to specific duration within Treatment model, if applicable
  purchaseDate: Date
  expiryDate: Date
  totalQuantity: number // Total sessions including bonus
  remainingQuantity: number
  status: "active" | "expired" | "depleted" | "cancelled"
  paymentMethodId: mongoose.Types.ObjectId // Ref to PaymentMethod model
  paymentAmount: number // Total amount paid for this subscription package
  pricePerSession?: number // Price of a single session at the time of purchase
  createdAt: Date
  updatedAt: Date
}

const UserSubscriptionSchema = new Schema<IUserSubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subscriptionId: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    treatmentId: {
      type: Schema.Types.ObjectId,
      ref: "Treatment",
      required: true,
    },
    selectedDurationId: {
      // Store the _id of the duration object from Treatment.durations
      type: Schema.Types.ObjectId,
      ref: "Treatment.durations", // This ref might not work directly like this in Mongoose for subdocuments.
      // It's more for documentation here. We'll populate manually or ensure IDs are unique.
      required: false,
    },
    purchaseDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    totalQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    remainingQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "expired", "depleted", "cancelled"],
      default: "active",
      index: true,
    },
    paymentMethodId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentMethod",
      required: true,
    },
    paymentAmount: {
      // Total price paid for the subscription package
      type: Number,
      required: true,
      min: 0,
    },
    pricePerSession: {
      // Price of a single session at the time of purchase
      type: Number,
      required: false, // Make it optional for now, can be required if always available
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

// Index for common queries
UserSubscriptionSchema.index({ userId: 1, status: 1, expiryDate: 1 })

// Update status to 'expired' if expiryDate is passed - can be handled by a cron job or a pre-find hook
UserSubscriptionSchema.pre("find", (next) => {
  // Consider implications of updating on read. A cron job is usually better for this.
  // For now, this logic is commented out to avoid unintended side effects on queries.
  // const today = new Date();
  // this.model.updateMany(
  //   { expiryDate: { $lt: today }, status: "active" },
  //   { $set: { status: "expired" } }
  // ).exec(); // exec() to ensure it runs, but be careful with performance
  next()
})

const UserSubscription: Model<IUserSubscription> =
  mongoose.models.UserSubscription || mongoose.model<IUserSubscription>("UserSubscription", UserSubscriptionSchema)

export default UserSubscription
