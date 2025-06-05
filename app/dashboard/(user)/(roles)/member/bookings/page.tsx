import { getUserBookings } from "@/actions/booking-actions"
import { BookingsClient } from "@/components/dashboard/member/bookings/bookings-client"
import { getTranslations } from "next-intl/server" // For server component translations
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

export default async function MemberBookingsPage() {
  const t = await getTranslations("bookings") // Using next-intl for server component
  const { success, data, error } = await getUserBookings()

  if (!success || !data) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>{t("errors.fetchErrorTitle")}</AlertTitle>
          <AlertDescription>{error || t("errors.fetchErrorGeneric")}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <BookingsClient initialUpcomingBookings={data.upcomingBookings} initialPastBookings={data.pastBookings} />
}
