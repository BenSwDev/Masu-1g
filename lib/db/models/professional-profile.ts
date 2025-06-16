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



// Professional profile interface
export interface IProfessionalProfile extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: ProfessionalStatus
  isActive: boolean
  
  // Professional details
  profileImage?: string
  
  // Treatments and pricing
  treatments: ITreatmentPricing[]
  
  // Work areas
  workAreas: IWorkArea[]
  

  
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
const TreatmentPricingSchema = new Schema<ITreatmentPricing>({
  treatmentId: { 
    type: Schema.Types.ObjectId, 
    ref: "Treatment", 
    required: true 
  },
  durationId: { 
    type: Schema.Types.ObjectId, 
    ref: "TreatmentDuration" 
  },
  professionalPrice: { type: Number, required: true, min: 0 }
}, { _id: false })

// Work area schema
const WorkAreaSchema = new Schema<IWorkArea>({
  cityId: { 
    type: Schema.Types.ObjectId, 
    ref: "City", 
    required: true 
  },
  cityName: { type: String, required: true },
  distanceRadius: { 
    type: String, 
    enum: ["20km", "40km", "60km", "80km", "unlimited"], 
    required: true,
    default: "20km"
  },
  coveredCities: [{ type: String }]
}, { _id: false })



// Professional profile schema
const ProfessionalProfileSchema = new Schema<IProfessionalProfile>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true
  },
  status: {
    type: String,
    enum: ["active", "pending_admin_approval", "pending_user_action", "rejected", "suspended"],
    default: "pending_admin_approval",
    required: true
  },
  isActive: { type: Boolean, default: true },
  
  // Professional details
  profileImage: { type: String, trim: true },
  
  // Treatments and pricing
  treatments: [TreatmentPricingSchema],
  
  // Work areas
  workAreas: [WorkAreaSchema],
  

  
  // Admin notes
  adminNotes: { type: String, trim: true },
  rejectionReason: { type: String, trim: true },
  
  // Timestamps
  appliedAt: { type: Date, default: Date.now, required: true },
  approvedAt: { type: Date },
  rejectedAt: { type: Date },
  lastActiveAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Create compound indexes for better performance - no duplicate field indexes
ProfessionalProfileSchema.index({ userId: 1 }, { unique: true })
ProfessionalProfileSchema.index({ status: 1, isActive: 1 })
ProfessionalProfileSchema.index({ "treatments.treatmentId": 1 })
ProfessionalProfileSchema.index({ "workAreas.cityName": 1 })
ProfessionalProfileSchema.index({ "workAreas.cityId": 1 })
ProfessionalProfileSchema.index({ createdAt: -1 })
ProfessionalProfileSchema.index({ lastActiveAt: -1 })

// Virtual for user relationship
ProfessionalProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
})

// Method to update covered cities based on distance radius
ProfessionalProfileSchema.methods.updateCoveredCities = async function(workAreaIndex: number = 0) {
  if (!this.workAreas[workAreaIndex]) return []
  
  const workArea = this.workAreas[workAreaIndex]
  
  try {
    const { CityDistance } = await import("@/lib/db/models/city-distance")
    
    const coveredCitiesResult = await (CityDistance as any).getCoveredCities(
      workArea.cityName, 
      workArea.distanceRadius
    )
    
    // Extract city names from the result
    const coveredCityNames = coveredCitiesResult
      .map((city: any) => city.toCityName || city.name)
      .filter((name: string) => name && name !== workArea.cityName)
    
    this.workAreas[workAreaIndex].coveredCities = coveredCityNames
    await this.save()
    
    return coveredCityNames
  } catch (error) {
    console.error("Error updating covered cities:", error)
    return []
  }
}



// Method to check if professional can handle a treatment
ProfessionalProfileSchema.methods.canHandleTreatment = function(treatmentId: string, durationId?: string) {
  return this.treatments.some((t: ITreatmentPricing) => 
    t.treatmentId.toString() === treatmentId &&
    (!durationId || !t.durationId || t.durationId.toString() === durationId)
  )
}

// Method to check if professional covers a city
ProfessionalProfileSchema.methods.coversCity = function(cityName: string) {
  return this.workAreas.some((area: IWorkArea) => 
    area.cityName === cityName || area.coveredCities.includes(cityName)
  )
}

// Static method to find suitable professionals for a booking
ProfessionalProfileSchema.statics.findSuitableForBooking = function(
  treatmentId: string, 
  cityName: string, 
  genderPreference?: string,
  durationId?: string
) {
  // Build comprehensive query with ALL required criteria
  const query: any = {
    // Professional must be active in our system AND in their profile
    status: 'active',
    isActive: true,
    // Professional must offer this specific treatment
    'treatments.treatmentId': new mongoose.Types.ObjectId(treatmentId)
  }
  
  // Add city coverage check - professional must cover this city
  query.$or = [
    { 'workAreas.cityName': cityName },
    { 'workAreas.coveredCities': cityName }
  ]
  
  // Build query with proper population
  let professionalQuery = this.find(query)
    .populate({
      path: 'userId',
      select: 'name email phone gender roles',
      // CRITICAL: Only users with professional role
      match: { roles: 'professional' }
    })
    .populate('treatments.treatmentId')
    .populate('workAreas.cityId')
  
  return professionalQuery
}

// Static method to get professional statistics
ProfessionalProfileSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 }
      }
    }
  ])
  
  const totalProfessionals = await this.countDocuments()
  const activeProfessionals = await this.countDocuments({ 
    status: "active", 
    isActive: true 
  })
  
  return {
    total: totalProfessionals,
    active: activeProfessionals,
    byStatus: stats.reduce((acc, stat) => {
      acc[stat._id] = stat.count
      return acc
    }, {} as Record<string, number>)
  }
}

export default mongoose.models.ProfessionalProfile as IProfessionalProfileModel || 
  mongoose.model<IProfessionalProfile, IProfessionalProfileModel>("ProfessionalProfile", ProfessionalProfileSchema)
