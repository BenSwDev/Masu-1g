import { Suspense } from "react"
import { Metadata } from "next"
import { redirect, notFound } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { BookingEditPage } from "@/components/dashboard/admin/bookings/booking-edit-page"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { getBookingById } from "../actions"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: "עריכת הזמנה | מנהל",
  description: "עריכת פרטי הזמנה במערכת",
}

function BookingLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      
      {/* Tabs Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 mb-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24" />
            ))}
          </div>
          
          {/* Content Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function BookingPageContent({ bookingId }: { bookingId: string }) {
  try {
    const result = await getBookingById(bookingId)

    if (!result.success || !result.booking) {
      notFound()
    }

    return (
      <BookingEditPage booking={result.booking} />
    )
  } catch (error) {
    console.error("Error loading booking:", error)
    notFound()
  }
}

export default async function BookingPage({ params }: { params: { bookingId: string } }) {
  const session = await requireUserSession()
  
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={<BookingLoadingSkeleton />}>
        <BookingPageContent bookingId={params.bookingId} />
      </Suspense>
    </div>
  )
} 