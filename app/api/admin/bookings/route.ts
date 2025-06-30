import { NextRequest, NextResponse } from "next/server"
import { getAllBookings } from "@/actions/booking/booking-crud"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const filters = {
      status: searchParams.get("status") || undefined,
      professional: searchParams.get("professional") || undefined,
      treatment: searchParams.get("treatment") || undefined,
      dateRange: searchParams.get("dateRange") || undefined,
      priceRange: searchParams.get("priceRange") || undefined,
      address: searchParams.get("address") || undefined,
      subscription_id: searchParams.get("subscription_id") || undefined,
      page: parseInt(searchParams.get("page") || "1"),
      limit: parseInt(searchParams.get("limit") || "20"),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortDirection: (searchParams.get("sortDirection") as "asc" | "desc") || "desc",
      search: searchParams.get("search") || undefined,
    }

    const result = await getAllBookings(filters)

    return NextResponse.json({
      success: true,
      bookings: result.bookings,
      totalPages: result.totalPages,
      totalBookings: result.totalBookings,
    })
  } catch (error) {
    console.error("Error in admin bookings API:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch bookings" }, { status: 500 })
  }
}
