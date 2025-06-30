import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MapPin } from "lucide-react"
import BookingsPerCityClient from "@/components/dashboard/admin/reports/bookings-per-city-client"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Bookings Per City",
  description: "Report showing bookings distribution by city",
}

export default async function BookingsPerCityPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-2">
          <MapPin className="h-6 w-6" />
          <Heading
            titleKey="reports.bookingsByCity.title"
            descriptionKey="reports.bookingsByCity.description"
          />
        </div>
        <Separator />
        <BookingsPerCityClient />
      </div>
    </ScrollArea>
  )
}
