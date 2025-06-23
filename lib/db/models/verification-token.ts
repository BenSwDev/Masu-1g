import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface IVerificationToken extends Document {
  _id: mongoose.Types.ObjectId
  identifier: string
  identifierType: "email" | "phone"
  code: string
  attempts: number
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const VerificationTokenSchema = new Schema<IVerificationToken>(
  {
    identifier: { type: String, required: true },
    identifierType: { type: String, enum: ["email", "phone"], required: true },
    code: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true },
)

// Create indexes for faster queries
VerificationTokenSchema.index({ identifier: 1, identifierType: 1, code: 1 })
VerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
VerificationTokenSchema.index({ identifier: 1, identifierType: 1, expiresAt: 1 })

const VerificationToken: Model<IVerificationToken> =
  mongoose.models.VerificationToken || mongoose.model<IVerificationToken>("VerificationToken", VerificationTokenSchema)

export default VerificationToken
