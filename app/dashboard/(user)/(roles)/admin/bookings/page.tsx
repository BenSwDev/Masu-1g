import { Suspense } from "react"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = "force-dynamic"

export const metadata = {
  title: "ניהול הזמנות",
  description: "צפייה וניהול כל ההזמנות במערכת",
}

import AdminBookingsClient from "@/components/dashboard/admin/bookings/admin-bookings-client"
import { BookingsTableSkeleton } from "@/components/dashboard/member/bookings/bookings-table-skeleton"
import { BookingsErrorBoundary } from "@/components/dashboard/admin/bookings/bookings-error-boundary"

function BookingsErrorFallback() {
  return (
    <Card className="w-full max-w-2xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          שגיאה בטעינת ההזמנות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">
          אירעה שגיאה בטעינת נתוני ההזמנות. אנא רענן את הדף או נסה שוב מאוחר יותר.
        </p>
        <div className="mt-4">
          <a
            href="/dashboard/admin/bookings"
            className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            רענון הדף
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

function BookingsContent() {
  return (
    <BookingsErrorBoundary>
      <AdminBookingsClient />
    </BookingsErrorBoundary>
  )
}

export default async function AdminBookingsPage() {
  try {
    const session = await requireUserSession()
    if (!session.user.roles?.includes("admin")) {
      redirect("/dashboard")
    }

    return (
      <div className="h-full">
        <Suspense fallback={<BookingsTableSkeleton />}>
          <BookingsContent />
        </Suspense>
      </div>
    )
  } catch (error) {
    console.error("Error in AdminBookingsPage:", error)
    return <BookingsErrorFallback />
  }
}
