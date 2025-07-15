import mongoose, { Schema, type Document, type Model } from "mongoose"

interface IPasswordResetToken extends Document {
  userId: mongoose.Schema.Types.ObjectId
  token: string
  expiresAt: Date
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
    expiresAt: {
      type: Date,
      required: true,
      // Example: Create an index that automatically deletes expired tokens
      // expires: "1h", // TTL index, Mongoose will delete after 1 hour from expiresAt time
      // OR rely on a cron job to clean up. For now, just store expiry.
    },
  },
  { timestamps: true },
) // Add timestamps for createdAt/updatedAt

// Optional: TTL index for automatic deletion by MongoDB after the 'expiresAt' time has passed.
// Note: 'expires' option on a field makes it a TTL index *if* it's a Date field.
// The value of 'expires' is the number of seconds.
// If you want it to expire *at* expiresAt, then the TTL index should be on expiresAt with { expireAfterSeconds: 0 }
// PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema)

export default PasswordResetToken
