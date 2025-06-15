import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface ICity extends Document {
  name: string
  isActive: boolean
  coordinates: {
    lat: number
    lng: number
  }
  createdAt: Date
  updatedAt: Date
}

const CitySchema = new Schema<ICity>(
  {
    name: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
  },
  { timestamps: true },
)

CitySchema.index({ name: 1 })

const City: Model<ICity> = mongoose.models.City || mongoose.model<ICity>("City", CitySchema)
export default City
