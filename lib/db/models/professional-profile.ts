import mongoose, { Schema, Document } from "mongoose"

// Professional status enum
export type ProfessionalStatus = 
  | "active" 
  | "pending_admin_approval" 
  | "pending_user_action" 
  | "rejected" 
  | "suspended"

// Distance options for work areas
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
  date: Date
  type: "booking_payment" | "bonus" | "penalty" | "adjustment"
  amount: number
  description: string
  bookingId?: mongoose.Types.ObjectId
  adminNote?: string
}

// Professional profile interface
export interface IProfessionalProfile extends Document {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId
  status: ProfessionalStatus
  
  // Professional details
  specialization?: string
  experience?: string
  certifications?: string[]
  bio?: string
  
  // Treatments and pricing
  treatments: ITreatmentPricing[]
  
  // Work areas
  workAreas: IWorkArea[]
  
  // Financial tracking
  totalEarnings: number
  pendingPayments: number
  financialTransactions: IFinancialTransaction[]
  
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
}

// Treatment pricing schema
const TreatmentPricingSchema = new Schema<ITreatmentPricing>({
  treatmentId: { type: Schema.Types.ObjectId, ref: "Treatment", required: true },
  durationId: { type: Schema.Types.ObjectId, ref: "TreatmentDuration" },
  professionalPrice: { type: Number, required: true, min: 0 }
}, { _id: false })

// Work area schema
const WorkAreaSchema = new Schema<IWorkArea>({
  cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
  cityName: { type: String, required: true },
  distanceRadius: { 
    type: String, 
    enum: ["20km", "40km", "60km", "80km", "unlimited"], 
    required: true 
  },
  coveredCities: [{ type: String }]
}, { _id: false })

// Financial transaction schema
const FinancialTransactionSchema = new Schema<IFinancialTransaction>({
  date: { type: Date, required: true, default: Date.now },
  type: { 
    type: String, 
    enum: ["booking_payment", "bonus", "penalty", "adjustment"], 
    required: true 
  },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  bookingId: { type: Schema.Types.ObjectId, ref: "Booking" },
  adminNote: { type: String }
}, { _id: false })

// Professional profile schema
const ProfessionalProfileSchema = new Schema<IProfessionalProfile>({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: ["active", "pending_admin_approval", "pending_user_action", "rejected", "suspended"],
    default: "pending_admin_approval",
    required: true,
    index: true
  },
  
  // Professional details
  specialization: { type: String, trim: true },
  experience: { type: String, trim: true },
  certifications: [{ type: String, trim: true }],
  bio: { type: String, trim: true },
  
  // Treatments and pricing
  treatments: [TreatmentPricingSchema],
  
  // Work areas
  workAreas: [WorkAreaSchema],
  
  // Financial tracking
  totalEarnings: { type: Number, default: 0, min: 0 },
  pendingPayments: { type: Number, default: 0, min: 0 },
  financialTransactions: [FinancialTransactionSchema],
  
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

// Indexes for better performance
ProfessionalProfileSchema.index({ userId: 1 })
ProfessionalProfileSchema.index({ status: 1 })
ProfessionalProfileSchema.index({ "treatments.treatmentId": 1 })
ProfessionalProfileSchema.index({ "workAreas.cityId": 1 })
ProfessionalProfileSchema.index({ createdAt: -1 })

// Virtual for user details
ProfessionalProfileSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
})

// Method to calculate available cities for a work area
ProfessionalProfileSchema.methods.calculateCoveredCities = function(cityId: string, distanceRadius: DistanceRadius) {
  // This would integrate with the city distance calculation system
  // For now, return empty array - will be implemented with city management
  return []
}

// Method to add financial transaction
ProfessionalProfileSchema.methods.addFinancialTransaction = function(transaction: Omit<IFinancialTransaction, 'date'>) {
  this.financialTransactions.push({
    ...transaction,
    date: new Date()
  })
  
  // Update totals based on transaction type
  if (transaction.type === 'booking_payment' || transaction.type === 'bonus') {
    this.totalEarnings += transaction.amount
  } else if (transaction.type === 'penalty') {
    this.totalEarnings = Math.max(0, this.totalEarnings - Math.abs(transaction.amount))
  }
  
  return this.save()
}

// Method to check if professional can handle a treatment
ProfessionalProfileSchema.methods.canHandleTreatment = function(treatmentId: string, durationId?: string) {
  return this.treatments.some(t => 
    t.treatmentId.toString() === treatmentId && 
    (!durationId || !t.durationId || t.durationId.toString() === durationId)
  )
}

// Method to check if professional covers a city
ProfessionalProfileSchema.methods.coversCity = function(cityName: string) {
  return this.workAreas.some(area => 
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
  const query: any = {
    status: 'active',
    'treatments.treatmentId': new mongoose.Types.ObjectId(treatmentId)
  }
  
  // Add city coverage check
  query.$or = [
    { 'workAreas.cityName': cityName },
    { 'workAreas.coveredCities': cityName }
  ]
  
  return this.find(query)
    .populate('userId', 'name email phone gender')
    .populate('treatments.treatmentId')
    .populate('workAreas.cityId')
}

export default mongoose.models.ProfessionalProfile || 
  mongoose.model<IProfessionalProfile>("ProfessionalProfile", ProfessionalProfileSchema)
