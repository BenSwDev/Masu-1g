import { getUserBookings } from "@/actions/booking-actions"
import { BookingsClient } from "@/components/dashboard/member/bookings/bookings-client"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { Terminal } from "lucide-react"

export const dynamic = "force-dynamic" // Ensure fresh data on each request

export default async function MemberBookingsPage() {
  const { success, data, error } = await getUserBookings()

  if (!success || !data) {
    // Display a simple, styled error message for initial load failure, consistent with other server pages.
    // Text is hardcoded English here; BookingsClient will handle its own i18n.
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Bookings</AlertTitle>
          <AlertDescription>
            {error || "We couldn't load your bookings at this time. Please try again later."}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return <BookingsClient initialUpcomingBookings={data.upcomingBookings} initialPastBookings={data.pastBookings} />
}
