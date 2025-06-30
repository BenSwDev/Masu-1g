import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { BookingCreatePage } from "@/components/dashboard/admin/bookings/booking-create-page"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"
import { getBookingInitialData } from "@/actions/booking/booking-special"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "יצירת הזמנה חדשה | מנהל",
  description: "יצירת הזמנה חדשה במערכת",
}

function BookingCreateLoadingSkeleton() {
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

      {/* Wizard Skeleton */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-6">
            <div className="flex justify-center">
              <Skeleton className="h-2 w-96" />
            </div>

            {/* Form Content Skeleton */}
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>

            <div className="flex justify-between">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function BookingCreatePageContent() {
  try {
    const initialData = await getBookingInitialData()

    if (!initialData.success) {
      throw new Error(initialData.error || "Failed to load initial data")
    }

    return <BookingCreatePage initialData={initialData.data!} />
  } catch (error) {
    console.error("Error loading booking initial data:", error)
    // Return page with empty data on error
    return (
      <BookingCreatePage
        initialData={{
          treatments: [],
          paymentMethods: [],
          workingHours: null,
          activeCoupons: [],
          activeGiftVouchers: [],
        }}
      />
    )
  }
}

export default async function BookingCreatePageRoute() {
  const session = await requireUserSession()

  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={<BookingCreateLoadingSkeleton />}>
        <BookingCreatePageContent />
      </Suspense>
    </div>
  )
}
