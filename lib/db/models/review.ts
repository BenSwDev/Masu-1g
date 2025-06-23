import mongoose, { Schema, type Document, type Model, type Types } from "mongoose"

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId
  bookingId: Types.ObjectId
  userId: Types.ObjectId // מי שמילא את חוות הדעת
  professionalId: Types.ObjectId // המטפל שעליו חוות הדעת
  treatmentId: Types.ObjectId // סוג הטיפול
  rating: number // דירוג 1-5
  comment?: string // ביקורת טקסטואלית (אופציונלי)
  professionalResponse?: string // תגובת המטפל (אופציונלי)
  createdAt: Date
  updatedAt: Date
}

const ReviewSchema: Schema<IReview> = new Schema(
  {
    bookingId: { 
      type: Schema.Types.ObjectId, 
      ref: "Booking", 
      required: true, 
      unique: true, // כל הזמנה יכולה לקבל רק חוות דעת אחת
      index: true 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    professionalId: { 
      type: Schema.Types.ObjectId, 
      ref: "User", 
      required: true, 
      index: true 
    },
    treatmentId: { 
      type: Schema.Types.ObjectId, 
      ref: "Treatment", 
      required: true 
    },
    rating: { 
      type: Number, 
      required: true, 
      min: 1, 
      max: 5 
    },
    comment: { 
      type: String, 
      trim: true,
      maxlength: 1000 
    },
    professionalResponse: { 
      type: String, 
      trim: true,
      maxlength: 1000 
    }
  },
  { timestamps: true }
)

// אינדקסים לחיפוש מהיר
ReviewSchema.index({ userId: 1, createdAt: -1 })
ReviewSchema.index({ professionalId: 1, rating: 1 })
ReviewSchema.index({ treatmentId: 1, rating: 1 })

const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema)

export default Review 