import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { CityDistance } from "@/lib/db/models/city-distance"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cityName = searchParams.get("cityName")
  const distanceRadius = searchParams.get("distanceRadius")

  if (!cityName || !distanceRadius) {
    return NextResponse.json({ 
      success: false, 
      error: "Missing parameters: cityName and distanceRadius are required" 
    }, { status: 400 })
  }

  try {
    await dbConnect()
    
    const cities = await (CityDistance as unknown as { getCoveredCities: (cityName: string, distanceRadius: string) => Promise<Array<{ toCityName?: string; name?: string }>> }).getCoveredCities(cityName, distanceRadius)
    const cityNames = cities.map((c) => c.toCityName || c.name)
    
    return NextResponse.json({ 
      success: true, 
      cities: cityNames,
      sourceCity: cityName,
      radius: distanceRadius
    })
  } catch (error) {
    console.error("Error fetching covered cities:", error)
    return NextResponse.json({ 
      success: false, 
      error: "Failed to fetch covered cities" 
    }, { status: 500 })
  }
}
