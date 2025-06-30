import mongoose, { Schema, Document, Model } from "mongoose"

export interface IPartnerProfile extends Document {
  userId: mongoose.Types.ObjectId
  businessNumber: string
  contactName: string
  createdAt: Date
  updatedAt: Date
}

const PartnerProfileSchema = new Schema<IPartnerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    businessNumber: { type: String, required: true, trim: true },
    contactName: { type: String, required: true, trim: true },
  },
  {
    timestamps: true,
  }
)

const PartnerProfile: Model<IPartnerProfile> =
  mongoose.models.PartnerProfile ||
  mongoose.model<IPartnerProfile>("PartnerProfile", PartnerProfileSchema)

export default PartnerProfile
