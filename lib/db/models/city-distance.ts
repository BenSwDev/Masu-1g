import mongoose, { Schema, Document } from "mongoose"

// City interface - unified coordinates format
export interface ICity extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  coordinates: {
    lat: number
    lng: number
  }
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

// City distance interface
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

// City schema with unified coordinates
const CitySchema = new Schema<ICity>({
  name: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true,
    index: true 
  },
  coordinates: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
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
  fromCityName: { type: String, required: true, index: true },
  toCityName: { type: String, required: true, index: true },
  distanceKm: { type: Number, required: true, min: 0 }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
})

// Compound indexes for better performance
CityDistanceSchema.index({ fromCityId: 1, toCityId: 1 }, { unique: true })
CityDistanceSchema.index({ fromCityName: 1, distanceKm: 1 })

// Static method to find cities within distance
CityDistanceSchema.statics.findCitiesWithinDistance = function(
  fromCityName: string, 
  maxDistanceKm: number
) {
  return this.find({
    fromCityName: fromCityName,
    distanceKm: { $lte: maxDistanceKm }
  }).select('toCityName distanceKm').sort({ distanceKm: 1 })
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
    default: maxDistance = 20 // Default to 20km
  }
  
  if (maxDistance === Infinity) {
    // Return all active cities except the source city
    return mongoose.models.City.find({ 
      isActive: true,
      name: { $ne: cityName }
    }).select('name').sort({ name: 1 })
  }
  
  return this.findCitiesWithinDistance(cityName, maxDistance)
}

// Method to calculate distance between two coordinates (Haversine formula)
CitySchema.statics.calculateDistance = function(
  lat1: number, lng1: number, 
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return Math.round(R * c * 100) / 100 // Round to 2 decimal places
}

// Method to populate distance relationships
CitySchema.statics.populateDistances = async function() {
  const cities = await this.find({ isActive: true })
  const CityDistance = mongoose.models.CityDistance
  
  console.log(`Calculating distances for ${cities.length} cities...`)
  
  for (let i = 0; i < cities.length; i++) {
    for (let j = i + 1; j < cities.length; j++) {
      const city1 = cities[i]
      const city2 = cities[j]
      
      const distance = this.calculateDistance(
        city1.coordinates.lat,
        city1.coordinates.lng,
        city2.coordinates.lat,
        city2.coordinates.lng
      )
      
      // Create both directions
      await CityDistance.findOneAndUpdate(
        { fromCityId: city1._id, toCityId: city2._id },
        {
          fromCityId: city1._id,
          toCityId: city2._id,
          fromCityName: city1.name,
          toCityName: city2.name,
          distanceKm: distance
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
          distanceKm: distance
        },
        { upsert: true, new: true }
      )
    }
  }
  
  console.log("Distance calculations completed")
}

// Static method to recalculate distances when a new city is added
CitySchema.statics.calculateDistancesForNewCity = async function(newCityId: string) {
  const newCity = await this.findById(newCityId)
  if (!newCity) throw new Error("City not found")
  
  const existingCities = await this.find({ 
    isActive: true, 
    _id: { $ne: newCityId } 
  })
  
  const CityDistance = mongoose.models.CityDistance
  
  for (const existingCity of existingCities) {
    const distance = this.calculateDistance(
      newCity.coordinates.lat,
      newCity.coordinates.lng,
      existingCity.coordinates.lat,
      existingCity.coordinates.lng
    )
    
    // Create both directions
    await CityDistance.findOneAndUpdate(
      { fromCityId: newCity._id, toCityId: existingCity._id },
      {
        fromCityId: newCity._id,
        toCityId: existingCity._id,
        fromCityName: newCity.name,
        toCityName: existingCity.name,
        distanceKm: distance
      },
      { upsert: true, new: true }
    )
    
    await CityDistance.findOneAndUpdate(
      { fromCityId: existingCity._id, toCityId: newCity._id },
      {
        fromCityId: existingCity._id,
        toCityId: newCity._id,
        fromCityName: existingCity.name,
        toCityName: newCity.name,
        distanceKm: distance
      },
      { upsert: true, new: true }
    )
  }
}

export const City = mongoose.models.City || mongoose.model<ICity>("City", CitySchema)
export const CityDistance = mongoose.models.CityDistance || mongoose.model<ICityDistance>("CityDistance", CityDistanceSchema)

export default City 