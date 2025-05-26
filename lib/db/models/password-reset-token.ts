import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IPasswordResetToken extends Document {
  token: string
  userId: mongoose.Types.ObjectId
  expiryDate: Date
  used: boolean
  createdAt: Date
}

const PasswordResetTokenSchema: Schema = new Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    used: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Index for automatic cleanup of expired tokens
PasswordResetTokenSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 })

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema)

export default PasswordResetToken
