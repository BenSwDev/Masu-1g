import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { BarChart3 } from "lucide-react"
import BookingsPerProfessionalClient from "@/components/dashboard/admin/reports/bookings-per-professional-client"

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Bookings Per Professional",
  description: "Report showing number of bookings for each professional"
}

export default async function BookingsPerProfessionalPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <Heading
            titleKey="reports.bookingsByProfessional.title"
            descriptionKey="reports.bookingsByProfessional.description"
          />
        </div>
        <Separator />
        <BookingsPerProfessionalClient />
      </div>
    </ScrollArea>
  )
}
