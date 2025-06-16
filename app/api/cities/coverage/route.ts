import { NextResponse } from "next/server"
import dbConnect from "@/lib/db/mongoose"
import { CityDistance } from "@/lib/db/models/city-distance"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const cityName = searchParams.get("cityName")
  const distanceRadius = searchParams.get("distanceRadius")

  if (!cityName || !distanceRadius) {
    return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 })
  }

  try {
    await dbConnect()
    const cities = await (CityDistance as any).getCoveredCities(cityName, distanceRadius)
    const names = cities.map((c: any) => c.toCityName || c.name)
    return NextResponse.json({ success: true, cities: names })
  } catch (error) {
    console.error("Error fetching covered cities:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch covered cities" }, { status: 500 })
  }
}
