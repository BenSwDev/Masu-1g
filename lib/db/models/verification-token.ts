import mongoose from "mongoose"

const verificationTokenSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
  },
  identifierType: {
    type: String,
    enum: ["email", "phone"],
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Create index for faster queries
verificationTokenSchema.index({ identifier: 1, identifierType: 1, code: 1 })
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const VerificationToken = mongoose.models.VerificationToken || mongoose.model("VerificationToken", verificationTokenSchema)

export default VerificationToken
