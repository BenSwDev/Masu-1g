import mongoose, { Schema, type Document, type Model } from "mongoose"

export type ProfessionalStatus =
  | "active" // פעיל
  | "pending_admin_approval" // ממתין לאישור מנהל
  | "pending_user_action" // ממתין למשתמש
  | "rejected" // נדחה
  | "suspended" // מושהה

export interface IProfessionalTreatment {
  treatmentId: mongoose.Types.ObjectId
  durationId?: mongoose.Types.ObjectId // For duration-based treatments
  professionalPrice: number
  isActive: boolean
}

export interface IWorkArea {
  cityId: mongoose.Types.ObjectId
  maxDistanceKm: number // 20, 40, 60, 80, or 0 for unlimited
  coveredCities: mongoose.Types.ObjectId[] // Auto-calculated based on city and distance
}

export interface IProfessionalProfile extends Document {
  userId: mongoose.Types.ObjectId
  professionalNumber: string
  status: ProfessionalStatus
  treatments: IProfessionalTreatment[]
  workAreas: IWorkArea[]
  totalEarnings: number
  createdAt: Date
  updatedAt: Date
}

const ProfessionalTreatmentSchema = new Schema<IProfessionalTreatment>(
  {
    treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
    durationId: { type: Schema.Types.ObjectId }, // For duration-based treatments
    professionalPrice: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
)

const WorkAreaSchema = new Schema<IWorkArea>(
  {
    cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
    maxDistanceKm: { 
      type: Number, 
      required: true, 
      enum: [20, 40, 60, 80, 0] // 0 means unlimited
    },
    coveredCities: [{ type: Schema.Types.ObjectId, ref: "City" }],
  },
  { _id: true }
)

const ProfessionalProfileSchema = new Schema<IProfessionalProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    professionalNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["active", "pending_admin_approval", "pending_user_action", "rejected", "suspended"],
      default: "pending_admin_approval",
    },
    treatments: [ProfessionalTreatmentSchema],
    workAreas: [WorkAreaSchema],
    totalEarnings: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
)

ProfessionalProfileSchema.index({ userId: 1 })
ProfessionalProfileSchema.index({ professionalNumber: 1 }, { unique: true })
ProfessionalProfileSchema.index({ status: 1 })
ProfessionalProfileSchema.index({ "treatments.treatmentId": 1 })
ProfessionalProfileSchema.index({ "workAreas.cityId": 1 })

const ProfessionalProfile: Model<IProfessionalProfile> =
  mongoose.models.ProfessionalProfile ||
  mongoose.model<IProfessionalProfile>("ProfessionalProfile", ProfessionalProfileSchema)

export default ProfessionalProfile
