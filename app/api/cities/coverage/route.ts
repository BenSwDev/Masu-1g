import { NextRequest, NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongodb"
import { CityDistance } from "@/lib/db/models/city-distance"

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { cityName, distanceRadius } = await request.json()
    
    if (!cityName || !distanceRadius) {
      return NextResponse.json(
        { error: "חסרים פרמטרים נדרשים" },
        { status: 400 }
      )
    }

    // Get covered cities using the static method
    const coveredCitiesResult = await CityDistance.getCoveredCities(
      cityName, 
      distanceRadius
    )
    
    let coveredCities: string[] = []
    
    if (distanceRadius === "unlimited") {
      // For unlimited, the query returns all cities except the source city
      // We need to add the source city back and combine
      const allOtherCities = coveredCitiesResult.map((city: any) => city.name).filter(Boolean)
      coveredCities = [cityName, ...allOtherCities].sort()
    } else {
      // For limited distance, the query returns cities within distance
      // We need to add the source city and combine
      const nearByCities = coveredCitiesResult
        .map((city: any) => city.toCityName || city.name)
        .filter(Boolean)
      
      // Always include the main city itself
      coveredCities = [cityName, ...nearByCities]
        .filter((city, index, arr) => arr.indexOf(city) === index) // Remove duplicates
        .sort()
    }

    return NextResponse.json({
      success: true,
      coveredCities,
      count: coveredCities.length
    })
  } catch (error) {
    console.error("Error calculating covered cities:", error)
    return NextResponse.json(
      { error: "שגיאה בחישוב ערים מכוסות" },
      { status: 500 }
    )
  }
}
