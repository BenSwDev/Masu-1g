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
      // For unlimited, get all cities
      const allOtherCities = coveredCitiesResult.map((city: any) => city.name).filter(Boolean)
      coveredCities = [cityName, ...allOtherCities]
        .filter((city, index, arr) => arr.indexOf(city) === index) // Remove duplicates
        .sort()
    } else {
      // For limited distance, get cities within distance + source city
      const nearByCities = coveredCitiesResult
        .map((city: any) => city.toCityName || city.name)
        .filter(Boolean)
      
      // Always include the source city itself
      coveredCities = [cityName, ...nearByCities]
        .filter((city, index, arr) => arr.indexOf(city) === index) // Remove duplicates
        .sort()
    }

    console.log(`Coverage calculation for ${cityName} (${distanceRadius}):`, {
      sourceCity: cityName,
      radius: distanceRadius,
      foundCities: coveredCities.length,
      cities: coveredCities
    })

    return NextResponse.json({
      success: true,
      coveredCities,
      count: coveredCities.length,
      sourceCity: cityName,
      radius: distanceRadius
    })
  } catch (error) {
    console.error("Error calculating covered cities:", error)
    return NextResponse.json(
      { error: "שגיאה בחישוב ערים מכוסות" },
      { status: 500 }
    )
  }
}
