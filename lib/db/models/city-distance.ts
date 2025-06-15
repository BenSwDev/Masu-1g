import mongoose, { Schema, type Document, type Model } from "mongoose"

export interface ICityDistance extends Document {
  fromCityId: mongoose.Types.ObjectId
  toCityId: mongoose.Types.ObjectId
  distanceKm: number
  createdAt: Date
  updatedAt: Date
}

const CityDistanceSchema = new Schema<ICityDistance>(
  {
    fromCityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
    toCityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
    distanceKm: { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

// Compound index to ensure unique city pairs and fast lookups
CityDistanceSchema.index({ fromCityId: 1, toCityId: 1 }, { unique: true })
CityDistanceSchema.index({ fromCityId: 1, distanceKm: 1 })

const CityDistance: Model<ICityDistance> =
  mongoose.models.CityDistance ||
  mongoose.model<ICityDistance>("CityDistance", CityDistanceSchema)

export default CityDistance 