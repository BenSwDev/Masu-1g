import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IPasswordResetToken extends Document {
  userId: mongoose.Schema.Types.ObjectId
  token: string
  expiryDate: Date
  used: boolean
}

const PasswordResetTokenSchema: Schema = new Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User", // Reference to the User model
    },
    token: {
      type: String,
      required: true,
      unique: true, // Tokens should be unique
    },
    expiryDate: {
      type: Date,
      required: true,
      index: true,
      expires: 0, // TTL index to remove document once expiryDate passes
    },
    used: { type: Boolean, default: false },
  },
  { timestamps: true },
) // Add timestamps for createdAt/updatedAt

PasswordResetTokenSchema.index({ expiryDate: 1 }, { expireAfterSeconds: 0 })

// Optional: TTL index for automatic deletion by MongoDB after the 'expiresAt' time has passed.
// Note: 'expires' option on a field makes it a TTL index *if* it's a Date field.
// The value of 'expires' is the number of seconds.
// If you want it to expire *at* expiresAt, then the TTL index should be on expiresAt with { expireAfterSeconds: 0 }
// PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema)

export default PasswordResetToken
