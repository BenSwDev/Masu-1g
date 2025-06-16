import mongoose, { Schema, Document } from "mongoose"

// City interface
export interface ICity extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  coordinates: {
    latitude: number
    longitude: number
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// City distance relationship interface
export interface ICityDistance extends Document {
  _id: mongoose.Types.ObjectId
  fromCityId: mongoose.Types.ObjectId
  toCityId: mongoose.Types.ObjectId
  fromCityName: string
  toCityName: string
  distanceKm: number
  createdAt: Date
  updatedAt: Date
}

// City schema
const CitySchema = new Schema<ICity>({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  },
  coordinates: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  isActive: { type: Boolean, default: true, index: true }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// City distance schema
const CityDistanceSchema = new Schema<ICityDistance>({
  fromCityId: { 
    type: Schema.Types.ObjectId, 
    ref: "City", 
    required: true,
    index: true 
  },
  toCityId: { 
    type: Schema.Types.ObjectId, 
    ref: "City", 
    required: true,
    index: true 
  },
  fromCityName: { type: String, required: true },
  toCityName: { type: String, required: true },
  distanceKm: { type: Number, required: true, min: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound indexes for better performance
CityDistanceSchema.index({ fromCityId: 1, toCityId: 1 }, { unique: true })
CityDistanceSchema.index({ fromCityName: 1, toCityName: 1 })
CityDistanceSchema.index({ distanceKm: 1 })

// Static method to find cities within distance
CityDistanceSchema.statics.findCitiesWithinDistance = function(
  fromCityName: string, 
  maxDistanceKm: number
) {
  const query: any = {
    fromCityName: fromCityName,
    distanceKm: { $lte: maxDistanceKm }
  }
  
  return this.find(query).select('toCityName distanceKm')
}

// Static method to get covered cities for a work area
CityDistanceSchema.statics.getCoveredCities = function(
  cityName: string, 
  distanceRadius: string
) {
  let maxDistance: number
  
  switch (distanceRadius) {
    case "20km": maxDistance = 20; break
    case "40km": maxDistance = 40; break
    case "60km": maxDistance = 60; break
    case "80km": maxDistance = 80; break
    case "unlimited": maxDistance = Infinity; break
    default: maxDistance = 0
  }
  
  if (maxDistance === Infinity) {
    // Return all active cities
    return mongoose.models.City.find({ isActive: true }).select('name')
  }
  
  return this.findCitiesWithinDistance(cityName, maxDistance)
}

// Method to calculate distance between two coordinates (Haversine formula)
CitySchema.statics.calculateDistance = function(
  lat1: number, lon1: number, 
  lat2: number, lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Method to populate distance relationships
CitySchema.statics.populateDistances = async function() {
  const cities = await this.find({ isActive: true })
  const CityDistance = mongoose.models.CityDistance
  
  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const city1 = cities[i]
      const city2 = cities[j]
      
      const distance = this.calculateDistance(
        city1.coordinates.latitude,
        city1.coordinates.longitude,
        city2.coordinates.latitude,
        city2.coordinates.longitude
      )
      
      // Create both directions
      await CityDistance.findOneAndUpdate(
        { fromCityId: city1._id, toCityId: city2._id },
        {
          fromCityId: city1._id,
          toCityId: city2._id,
          fromCityName: city1.name,
          toCityName: city2.name,
          distanceKm: Math.round(distance * 100) / 100 // Round to 2 decimal places
        },
        { upsert: true, new: true }
      )
      
      await CityDistance.findOneAndUpdate(
        { fromCityId: city2._id, toCityId: city1._id },
        {
          fromCityId: city2._id,
          toCityId: city1._id,
          fromCityName: city2.name,
          toCityName: city1.name,
          distanceKm: Math.round(distance * 100) / 100
        },
        { upsert: true, new: true }
      )
    }
  }
}

export const City = mongoose.models.City || mongoose.model<ICity>("City", CitySchema)
export const CityDistance = mongoose.models.CityDistance || mongoose.model<ICityDistance>("CityDistance", CityDistanceSchema)

export default { City, CityDistance } 