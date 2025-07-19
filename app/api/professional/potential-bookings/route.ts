import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import dbConnect from "@/lib/db/mongoose"
import ProfessionalProfile from "@/lib/db/models/professional-profile"
import Booking from "@/lib/db/models/booking"
import Treatment from "@/lib/db/models/treatment"
import { City } from "@/lib/db/models/city-distance"
import { logger } from "@/lib/logs/logger"

// Helper function to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in kilometers
  return distance;
}

// Helper function to get distance limit from radius string
function getDistanceLimit(radius: string): number {
  switch (radius) {
    case '20km': return 20;
    case '40km': return 40;
    case '60km': return 60;
    case '80km': return 80;
    case 'unlimited': return 1000; // Very large number for unlimited
    default: return 20;
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json(
        { success: false, error: "לא מורשה" },
        { status: 401 }
      )
    }

    if (session.user.activeRole !== "professional") {
      return NextResponse.json(
        { success: false, error: "נדרש תפקיד מטפל" },
        { status: 403 }
      )
    }

    await dbConnect()

    // Find the professional profile for the current user
    const professionalProfile = await ProfessionalProfile.findOne({
      userId: session.user.id,
      status: 'active'
    })

    if (!professionalProfile) {
      return NextResponse.json(
        { success: false, error: "פרופיל מטפל לא נמצא" },
        { status: 404 }
      )
    }

    // If professional is not active or has no work areas/treatments, return empty
    if (!professionalProfile.isActive || 
        !professionalProfile.workAreas?.length || 
        !professionalProfile.treatments?.length) {
      return NextResponse.json({
        success: true,
        bookings: [],
        total: 0,
        message: "אין הזמנות פוטנציאליות - ודא שהפרופיל פעיל ויש טיפולים ואזורי פעילות"
      })
    }

    // Get professional's treatment IDs
    const professionalTreatmentIds = professionalProfile.treatments.map(t => t.treatmentId)

    // Get professional's work areas with coordinates
    const workAreaCities = await City.find({
      name: { $in: professionalProfile.workAreas.map(area => area.cityName) }
    }).lean()

    const workAreaCoords = new Map()
    workAreaCities.forEach(city => {
      if (city.coordinates) {
        workAreaCoords.set(city.name, city.coordinates)
      }
    })

    // Find potential bookings - not assigned and matching treatments
    const potentialBookings = await Booking.find({
      assignedProfessional: { $exists: false },
      status: 'pending',
      treatmentId: { $in: professionalTreatmentIds },
      // Only future bookings
      preferredDate: { $gte: new Date().toISOString().split('T')[0] }
    })
    .populate('treatmentId', 'name')
    .sort({ preferredDate: 1, preferredTime: 1 })
    .lean()

    // Filter bookings by work area coverage and calculate match scores
    const matchingBookings = []

    for (const booking of potentialBookings) {
      let bestMatch = null
      let minDistance = Infinity
      let matchScore = 0

      // Check if booking location is within any work area
      for (const workArea of professionalProfile.workAreas) {
        const centerCoords = workAreaCoords.get(workArea.cityName)
        if (!centerCoords) continue

        // Get booking city coordinates
        const bookingCity = await City.findOne({ name: booking.bookingAddress.city }).lean()
        if (!bookingCity?.coordinates) continue

        // Calculate distance
        const distance = calculateDistance(
          centerCoords.lat, centerCoords.lng,
          bookingCity.coordinates.lat, bookingCity.coordinates.lng
        )

        const distanceLimit = getDistanceLimit(workArea.distanceRadius)
        
        if (distance <= distanceLimit && distance < minDistance) {
          minDistance = distance
          bestMatch = {
            workArea,
            distance,
            distanceLimit
          }
          
          // Calculate match score (0-100)
          const distanceScore = Math.max(0, 100 - (distance / distanceLimit) * 50)
          const treatmentScore = 30 // Base score for matching treatment
          const timeScore = 20 // Base score for timing
          
          matchScore = Math.min(100, distanceScore + treatmentScore + timeScore)
        }
      }

      // If booking is within coverage area, add to results
      if (bestMatch) {
        matchingBookings.push({
          _id: booking._id.toString(),
          treatmentType: booking.treatmentId?.name || booking.treatmentType,
          preferredDate: booking.preferredDate,
          preferredTime: booking.preferredTime,
          bookingAddress: booking.bookingAddress,
          priceDetails: booking.priceDetails,
          distanceFromProfessional: Math.round(minDistance * 10) / 10,
          matchScore: Math.round(matchScore),
          createdAt: booking.createdAt
        })
      }
    }

    // Sort by match score (highest first) and then by date
    matchingBookings.sort((a, b) => {
      if (b.matchScore !== a.matchScore) {
        return b.matchScore - a.matchScore
      }
      return new Date(a.preferredDate).getTime() - new Date(b.preferredDate).getTime()
    })

    logger.info("Professional potential bookings retrieved", {
      professionalId: professionalProfile._id,
      userId: session.user.id,
      totalPotential: potentialBookings.length,
      matchingBookings: matchingBookings.length,
      workAreasCount: professionalProfile.workAreas.length,
      treatmentsCount: professionalProfile.treatments.length
    })

    return NextResponse.json({
      success: true,
      bookings: matchingBookings,
      total: matchingBookings.length,
      metadata: {
        totalPotentialBookings: potentialBookings.length,
        workAreasCount: professionalProfile.workAreas.length,
        treatmentsCount: professionalProfile.treatments.length
      }
    })

  } catch (error) {
    logger.error("Error fetching professional potential bookings:", {
      error: error instanceof Error ? error.message : String(error),
      userId: session?.user?.id
    })

    return NextResponse.json(
      { 
        success: false, 
        error: "שגיאה בטעינת ההזמנות הפוטנציאליות" 
      },
      { status: 500 }
    )
  }
} 