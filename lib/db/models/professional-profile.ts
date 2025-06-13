import mongoose, { Schema, type Document, type Model } from "mongoose"

export type ProfessionalStatus =
  | "active"
  | "inactive"
  | "pending"
  | "incomplete"
  | "rejected"

export interface IProfessionalProfile extends Document {
  userId: mongoose.Types.ObjectId
  professionalNumber: string
  status: ProfessionalStatus
  createdAt: Date
  updatedAt: Date
}

const ProfessionalProfileSchema = new Schema<IProfessionalProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    professionalNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "inactive", "pending", "incomplete", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
)

ProfessionalProfileSchema.index({ userId: 1 })
ProfessionalProfileSchema.index({ professionalNumber: 1 }, { unique: true })

const ProfessionalProfile: Model<IProfessionalProfile> =
  mongoose.models.ProfessionalProfile ||
  mongoose.model<IProfessionalProfile>("ProfessionalProfile", ProfessionalProfileSchema)

export default ProfessionalProfile
