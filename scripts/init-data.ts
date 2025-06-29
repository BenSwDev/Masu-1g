import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import dbConnect from "@/lib/db/mongoose"

// Israeli cities with accurate coordinates
const ISRAEL_CITIES = [
  { name: "תל אביב", lat: 32.0853, lng: 34.7818 },
  { name: "ירושלים", lat: 31.7683, lng: 35.2137 },
  { name: "חיפה", lat: 32.7940, lng: 34.9896 },
  { name: "ראשון לציון", lat: 31.9730, lng: 34.8071 },
  { name: "פתח תקווה", lat: 32.0878, lng: 34.8878 },
  { name: "אשדוד", lat: 31.7940, lng: 34.6593 },
  { name: "נתניה", lat: 32.3215, lng: 34.8532 },
  { name: "באר שבע", lat: 31.2518, lng: 34.7913 },
  { name: "בני ברק", lat: 32.0973, lng: 34.8467 },
  { name: "רמת גן", lat: 32.0695, lng: 34.8241 },
  { name: "הרצליה", lat: 32.1624, lng: 34.8444 },
  { name: "חולון", lat: 32.0167, lng: 34.7747 },
  { name: "בת ים", lat: 32.0167, lng: 34.7500 },
  { name: "כפר סבא", lat: 32.1747, lng: 34.9068 },
  { name: "רעננה", lat: 32.1848, lng: 34.8706 },
  { name: "אשקלון", lat: 31.6688, lng: 34.5742 },
  { name: "רחובות", lat: 31.8969, lng: 34.8186 },
  { name: "מודיעין מכבים רעות", lat: 31.8969, lng: 35.0095 },
  { name: "לוד", lat: 31.9516, lng: 34.8958 },
  { name: "רמלה", lat: 31.9293, lng: 34.8667 },
  { name: "נס ציונה", lat: 31.9239, lng: 34.7968 },
  { name: "עפולה", lat: 32.6078, lng: 35.2897 },
  { name: "עכו", lat: 32.9252, lng: 35.0818 },
  { name: "נהריה", lat: 33.0078, lng: 35.0950 },
  { name: "טבריה", lat: 32.7922, lng: 35.5312 },
  { name: "צפת", lat: 32.9648, lng: 35.4956 },
  { name: "קריית גת", lat: 31.6100, lng: 34.7642 },
  { name: "דימונה", lat: 31.0695, lng: 35.0323 },
  { name: "אילת", lat: 29.5581, lng: 34.9482 },
  { name: "קריית שמונה", lat: 33.2074, lng: 35.5695 }
]

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

export async function initializeData() {
  try {
    await dbConnect()
    
    // Import models dynamically to avoid issues
    const { City, CityDistance } = await import("@/lib/db/models/city-distance")
    const User = (await import("@/lib/db/models/user")).default
    const ProfessionalProfile = (await import("@/lib/db/models/professional-profile")).default
    const Treatment = (await import("@/lib/db/models/treatment")).default
    
    // TODO: Remove debug log

    
    // Check if cities already exist
    const existingCitiesCount = await City.countDocuments()
    
    if (existingCitiesCount === 0) {
      // TODO: Remove debug log

      
      // Create cities
      const createdCities = []
      for (const cityData of ISRAEL_CITIES) {
        const city = new City({
          name: cityData.name,
          coordinates: {
            lat: cityData.lat,
            lng: cityData.lng
          },
          isActive: true
        })
        await city.save()
        createdCities.push(city)
      }
      
      // TODO: Remove debug log

      
      // Calculate distances between all cities
      // TODO: Remove debug log

      let distanceCount = 0
      
      for (let i = 0; i < createdCities.length; i++) {
        for (let j = i + 1; j < createdCities.length; j++) {
          const city1 = createdCities[i]
          const city2 = createdCities[j]
          
          const distance = calculateDistance(
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
          
          distanceCount += 2
        }
      }
      
      // TODO: Remove debug log

    } else {
      // TODO: Remove debug log

    }
    
    // Check if professionals already exist
    const existingProfessionalsCount = await ProfessionalProfile.countDocuments()
    
    if (existingProfessionalsCount === 0) {
      // TODO: Remove debug log

      
      // Get available treatments (we know they exist from the production DB)
      const treatments = await Treatment.find({ isActive: true }).limit(3)
      
      // Get a sample city (Tel Aviv)
      const telAvivCity = await City.findOne({ name: "תל אביב" })
      
      console.log("Checking treatments and city...")
      
      if (telAvivCity && treatments.length > 0) {
        // Create sample user for professional
        const hashedPassword = await bcrypt.hash("Demo123456!", 10)
        
        const sampleUser = new User({
          name: "ד״ר יוסי כהן",
          email: "demo-professional@masu.co.il",
          phone: "0501234567",
          password: hashedPassword,
          gender: "male",
          roles: ["professional"],
          activeRole: "professional",
          isEmailVerified: true,
          dateOfBirth: new Date("1985-05-15")
        })
        
        await sampleUser.save()
        // TODO: Remove debug log

        
        // Create professional profile
        const professionalProfile = new ProfessionalProfile({
          userId: sampleUser._id,
          status: "active",
          isActive: true,
          specialization: "עיסוי רפואי ועיסוי רילקסציה",
          experience: "מטפל מוסמך עם ניסיון של 8 שנים בעיסוי רפואי ועיסוי שוודי. בוגר בית ספר לעיסוי רפואי והולדתי.",
          certifications: [
            "תעודת עיסוי רפואי",
            "תעודת עיסוי שוודי",
            "הסמכה בעיסוי רקמות עמוקות"
          ],
          bio: "מטפל מוסמך ומנוסה המתמחה בעיסוי רפואי ועיסוי רילקסציה. נותן שירות איכותי ומקצועי עם התאמה אישית לכל לקוח.",
          treatments: treatments.map(treatment => ({
            treatmentId: treatment._id,
            professionalPrice: treatment.fixedProfessionalPrice || 150
          })),
          workAreas: [{
            cityId: telAvivCity._id,
            cityName: telAvivCity.name,
            distanceRadius: "40km" as const,
            coveredCities: []
          }],
          totalEarnings: 0,
          pendingPayments: 0,
          financialTransactions: [],
          adminNotes: "מטפל לדוגמא שנוצר באתחול המערכת",
          appliedAt: new Date(),
          approvedAt: new Date(),
          lastActiveAt: new Date()
        })
        
        await professionalProfile.save()
        
        // TODO: Remove debug log

      } else {
        console.log("Missing required data for professional creation")

        if (treatments.length > 0) {
          console.log(`Found ${treatments.length} treatments`)
        }
      }
    } else {
      // TODO: Remove debug log

    }
    
    // TODO: Remove debug log

    
  } catch (error) {
    console.error("❌ Error initializing data:", error)
    throw error
  }
}

// Run initialization if called directly
if (require.main === module) {
  initializeData()
    .then(() => {
      // TODO: Remove debug log

      process.exit(0)
    })
    .catch((error) => {
      console.error("❌ Initialization failed:", error)
      process.exit(1)
    })
} 
