import mongoose, { Schema, Document } from "mongoose"

// Professional response status
type ProfessionalResponseStatus = 
  | "pending"     // SMS נשלח, ממתין לתגובה
  | "accepted"    // מטפל קיבל את ההזמנה
  | "declined"    // מטפל דחה את ההזמנה
  | "expired"     // פג תוקף התגובה

// Professional response interface
interface IProfessionalResponse extends Document {
  _id: mongoose.Types.ObjectId
  bookingId: mongoose.Types.ObjectId
  professionalId: mongoose.Types.ObjectId
  
  // SMS details
  smsMessageId?: string
  phoneNumber: string
  sentAt: Date
  
  // Response details
  status: ProfessionalResponseStatus
  respondedAt?: Date
  responseMethod?: "sms" | "app" | "phone"
  
  // Metadata
  createdAt: Date
  updatedAt: Date
}

// Professional response schema
const ProfessionalResponseSchema = new Schema<IProfessionalResponse>({
  bookingId: { 
    type: Schema.Types.ObjectId, 
    ref: "Booking", 
    required: true,
    index: true 
  },
  professionalId: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  
  // SMS details
  smsMessageId: { type: String },
  phoneNumber: { type: String, required: true },
  sentAt: { type: Date, required: true, default: Date.now },
  
  // Response details
  status: { 
    type: String, 
    enum: ["pending", "accepted", "declined", "expired"],
    default: "pending",
    required: true
  },
  respondedAt: { type: Date },
  responseMethod: { 
    type: String, 
    enum: ["sms", "app", "phone", "admin_assignment"]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound indexes for better performance
ProfessionalResponseSchema.index({ bookingId: 1, professionalId: 1 }, { unique: true })
ProfessionalResponseSchema.index({ status: 1 })

// Static method to find pending responses for a booking
ProfessionalResponseSchema.statics.findPendingForBooking = function(bookingId: string) {
  return this.find({
    bookingId: new mongoose.Types.ObjectId(bookingId),
    status: "pending"
  }).populate('professionalId', 'name phone')
}

// Static method to expire old responses (no longer needed without time limits)
ProfessionalResponseSchema.statics.expireOldResponses = function() {
  // No-op function - responses no longer expire automatically
  return Promise.resolve({ modifiedCount: 0 })
}

// Method to accept response
ProfessionalResponseSchema.methods.accept = function(responseMethod: "sms" | "app" | "phone" = "sms") {
  this.status = "accepted"
  this.respondedAt = new Date()
  this.responseMethod = responseMethod
  return this.save()
}

// Method to decline response
ProfessionalResponseSchema.methods.decline = function(responseMethod: "sms" | "app" | "phone" = "sms") {
  this.status = "declined"
  this.respondedAt = new Date()
  this.responseMethod = responseMethod
  return this.save()
}

export default mongoose.models.ProfessionalResponse || 
  mongoose.model<IProfessionalResponse>("ProfessionalResponse", ProfessionalResponseSchema) 