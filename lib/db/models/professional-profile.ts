import mongoose, { Schema, Document } from "mongoose"

// Professional status enum
export type ProfessionalStatus =
  | "active"
  | "pending_admin_approval"
  | "pending_user_action"
  | "rejected"
  | "suspended"

// Distance radius options
export type DistanceRadius = "20km" | "40km" | "60km" | "80km" | "unlimited"

// Treatment pricing interface
export interface ITreatmentPricing {
  treatmentId: mongoose.Types.ObjectId
  durationId?: mongoose.Types.ObjectId
  professionalPrice: number // Amount professional receives
}

// Work area interface
export interface IWorkArea {
  cityId: mongoose.Types.ObjectId
  cityName: string
  distanceRadius: DistanceRadius
  coveredCities: string[] // List of cities covered by this work area
}

// Financial transaction interface
export interface IFinancialTransaction {
  type: "payment" | "adjustment" | "withdrawal" | "bonus" | "penalty"
  amount: number
  description: string
  date: Date
  bookingId?: mongoose.Types.ObjectId
  adminUserId?: mongoose.Types.ObjectId
  adminNote?: string
}

// Bank details interface
export interface IBankDetails {
  bankName: string
  branchNumber: string
  accountNumber: string
}

// Document interface
export interface IProfessionalDocument {
  id: string
  type: string
  name: string
  status: "pending" | "approved" | "rejected"
  uploadDate: Date
  approvedDate?: Date
  rejectedDate?: Date
  rejectionReason?: string
  fileUrl?: string
}

// Professional profile interface
export interface IProfessionalProfile extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: ProfessionalStatus
  isActive: boolean

  // Professional details
  specialization?: string
  experience?: string
  certifications?: string[]
  bio?: string
  profileImage?: string

  // Treatments and pricing
  treatments: ITreatmentPricing[]

  // Work areas
  workAreas: IWorkArea[]

  // Financial tracking
  totalEarnings: number
  pendingPayments: number
  financialTransactions: IFinancialTransaction[]

  // Bank details and documents
  bankDetails?: IBankDetails
  documents?: IProfessionalDocument[]

  // Admin notes
  adminNotes?: string
  rejectionReason?: string

  // Timestamps
  appliedAt: Date
  approvedAt?: Date
  rejectedAt?: Date
  lastActiveAt?: Date

  createdAt: Date
  updatedAt: Date

  // Methods
  updateCoveredCities(workAreaIndex?: number): Promise<string[]>
  addFinancialTransaction(transaction: Omit<IFinancialTransaction, "date">): Promise<any>
  canHandleTreatment(treatmentId: string, durationId?: string): boolean
  coversCity(cityName: string): boolean
}

// Add static methods interface
export interface IProfessionalProfileModel extends mongoose.Model<IProfessionalProfile> {
  findSuitableForBooking(
    treatmentId: string,
    cityName: string,
    genderPreference?: string,
    durationId?: string
  ): mongoose.Query<IProfessionalProfile[], IProfessionalProfile>
  getStatistics(): Promise<{
    total: number
    active: number
    byStatus: Record<string, number>
  }>
}

// Treatment pricing schema
const TreatmentPricingSchema = new Schema<ITreatmentPricing>(
  {
    treatmentId: {
      type: Schema.Types.ObjectId,
      ref: "Treatment",
      required: true,
    },
    durationId: {
      type: Schema.Types.ObjectId,
      ref: "TreatmentDuration",
    },
    professionalPrice: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

// Work area schema
const WorkAreaSchema = new Schema<IWorkArea>(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: true,
    },
    cityName: { type: String, required: true },
    distanceRadius: {
      type: String,
      enum: ["20km", "40km", "60km", "80km", "unlimited"],
      required: true,
      default: "20km",
    },
    coveredCities: [{ type: String }],
  },
  { _id: false }
)

// Financial transaction schema
const FinancialTransactionSchema = new Schema<IFinancialTransaction>(
  {
    type: {
      type: String,
      enum: ["payment", "adjustment", "withdrawal", "bonus", "penalty"],
      required: true,
    },
    amount: { type: Number, required: true },
    description: { type: String, required: true },
    date: { type: Date, default: Date.now, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
    adminUserId: { type: Schema.Types.ObjectId, ref: "User" },
    adminNote: { type: String, trim: true },
  },
  { _id: false }
)

// Bank details schema
const BankDetailsSchema = new Schema<IBankDetails>(
  {
    bankName: { type: String, required: true, trim: true },
    branchNumber: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
  },
  { _id: false }
)

// Professional document schema
const ProfessionalDocumentSchema = new Schema<IProfessionalDocument>(
  {
    id: { type: String, required: true },
    type: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    uploadDate: { type: Date, default: Date.now, required: true },
    approvedDate: { type: Date },
    rejectedDate: { type: Date },
    rejectionReason: { type: String, trim: true },
    fileUrl: { type: String, trim: true },
  },
  { _id: false }
)

// Professional profile schema
const ProfessionalProfileSchema = new Schema<IProfessionalProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: ["active", "pending_admin_approval", "pending_user_action", "rejected", "suspended"],
      default: "pending_admin_approval",
      required: true,
    },
    isActive: { type: Boolean, default: true },

    // Professional details
    specialization: { type: String, trim: true },
    experience: { type: String, trim: true },
    certifications: [{ type: String, trim: true }],
    bio: { type: String, trim: true },
    profileImage: { type: String, trim: true },

    // Treatments and pricing
    treatments: [TreatmentPricingSchema],

    // Work areas
    workAreas: [WorkAreaSchema],

    // Financial tracking
    totalEarnings: { type: Number, default: 0, min: 0 },
    pendingPayments: { type: Number, default: 0, min: 0 },
    financialTransactions: [FinancialTransactionSchema],

    // Bank details and documents
    bankDetails: BankDetailsSchema,
    documents: [ProfessionalDocumentSchema],

    // Admin notes
    adminNotes: { type: String, trim: true },
    rejectionReason: { type: String, trim: true },

    // Timestamps
    appliedAt: { type: Date, default: Date.now, required: true },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    lastActiveAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

// Create compound indexes for better performance - no duplicate field indexes
// Note: unique index on userId is already created via schema definition
ProfessionalProfileSchema.index({ status: 1, isActive: 1 })
ProfessionalProfileSchema.index({ "treatments.treatmentId": 1 })
ProfessionalProfileSchema.index({ "workAreas.cityName": 1 })
ProfessionalProfileSchema.index({ "workAreas.cityId": 1 })
ProfessionalProfileSchema.index({ createdAt: -1 })
ProfessionalProfileSchema.index({ lastActiveAt: -1 })

// Virtual for user relationship
ProfessionalProfileSchema.virtual("user", {
  ref: "User",
  localField: "userId",
  foreignField: "_id",
  justOne: true,
})

// Method to update covered cities based on distance radius
ProfessionalProfileSchema.methods.updateCoveredCities = async function (workAreaIndex: number = 0) {
  if (!this.workAreas[workAreaIndex]) return []

  const workArea = this.workAreas[workAreaIndex]

  try {
    const { CityDistance } = await import("@/lib/db/models/city-distance")

    // Get covered cities based on distance radius
    const coveredCitiesResult = await (CityDistance as any).getCoveredCities(
      workArea.cityName,
      workArea.distanceRadius
    )

    // Extract city names from the result
    let coveredCityNames: string[] = []

    if (workArea.distanceRadius === "unlimited") {
      // For unlimited, get all cities
      const allOtherCities = coveredCitiesResult.map((city: any) => city.name).filter(Boolean)
      coveredCityNames = [workArea.cityName, ...allOtherCities]
        .filter((city, index, arr) => arr.indexOf(city) === index) // Remove duplicates
        .sort()
    } else {
      // For limited distance, get cities within distance + source city
      const nearByCities = coveredCitiesResult
        .map((city: any) => city.toCityName || city.name)
        .filter(Boolean)

      // Always include the source city itself
      coveredCityNames = [workArea.cityName, ...nearByCities]
        .filter((city, index, arr) => arr.indexOf(city) === index) // Remove duplicates
        .sort()
    }

    console.log(`Updating covered cities for ${workArea.cityName} (${workArea.distanceRadius}):`, {
      sourceCity: workArea.cityName,
      radius: workArea.distanceRadius,
      foundCities: coveredCityNames.length,
      cities: coveredCityNames,
    })

    // Update the work area with all covered cities (including the main city)
    this.workAreas[workAreaIndex].coveredCities = coveredCityNames
    await this.save()

    return coveredCityNames
  } catch (error) {
    console.error("Error updating covered cities:", error)
    // In case of error, at least include the main city
    this.workAreas[workAreaIndex].coveredCities = [workArea.cityName]
    await this.save()
    return [workArea.cityName]
  }
}

// Method to add financial transaction
ProfessionalProfileSchema.methods.addFinancialTransaction = function (
  transaction: Omit<IFinancialTransaction, "date">
) {
  const newTransaction = {
    ...transaction,
    date: new Date(),
  }

  this.financialTransactions.push(newTransaction)

  // Update totals based on transaction type
  if (transaction.type === "payment" || transaction.type === "bonus") {
    this.totalEarnings += transaction.amount
    if (transaction.type === "payment") {
      this.pendingPayments = Math.max(0, this.pendingPayments - transaction.amount)
    }
  } else if (transaction.type === "adjustment") {
    this.totalEarnings += transaction.amount
  } else if (transaction.type === "penalty") {
    this.totalEarnings = Math.max(0, this.totalEarnings - transaction.amount)
  }

  return this.save()
}

// Method to check if professional can handle a treatment
ProfessionalProfileSchema.methods.canHandleTreatment = function (
  treatmentId: string,
  durationId?: string
) {
  return this.treatments.some(
    (t: ITreatmentPricing) =>
      t.treatmentId.toString() === treatmentId &&
      (!durationId || !t.durationId || t.durationId.toString() === durationId)
  )
}

// Method to check if professional covers a city
ProfessionalProfileSchema.methods.coversCity = function (cityName: string) {
  return this.workAreas.some(
    (area: IWorkArea) => area.cityName === cityName || area.coveredCities.includes(cityName)
  )
}

// Static method to find suitable professionals for a booking
ProfessionalProfileSchema.statics.findSuitableForBooking = function (
  treatmentId: string,
  cityName: string,
  genderPreference?: string,
  durationId?: string
) {
  // Build comprehensive query with ALL required criteria
  const query: any = {
    // Professional must be active in our system AND in their profile
    status: "active",
    isActive: true,
    // Professional must offer this specific treatment
    "treatments.treatmentId": new mongoose.Types.ObjectId(treatmentId),
  }

  // Add city coverage check - professional must cover this city
  query.$or = [{ "workAreas.cityName": cityName }, { "workAreas.coveredCities": cityName }]

  // Build query with proper population
  let professionalQuery = this.find(query)
    .populate({
      path: "userId",
      select: "name email phone gender roles",
      // CRITICAL: Only users with professional role
      match: { roles: "professional" },
    })
    .populate("treatments.treatmentId")
    .populate("workAreas.cityId")

  return professionalQuery
}

// Static method to get professional statistics
ProfessionalProfileSchema.statics.getStatistics = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ])

  const totalProfessionals = await this.countDocuments()
  const activeProfessionals = await this.countDocuments({
    status: "active",
    isActive: true,
  })

  return {
    total: totalProfessionals,
    active: activeProfessionals,
    byStatus: stats.reduce(
      (acc, stat) => {
        acc[stat._id] = stat.count
        return acc
      },
      {} as Record<string, number>
    ),
  }
}

export default (mongoose.models.ProfessionalProfile as IProfessionalProfileModel) ||
  mongoose.model<IProfessionalProfile, IProfessionalProfileModel>(
    "ProfessionalProfile",
    ProfessionalProfileSchema
  )
