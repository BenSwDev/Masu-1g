import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { PieChart } from "lucide-react"
import RevenueSummaryClient from "@/components/dashboard/admin/reports/revenue-summary-client"

export const dynamic = 'force-dynamic'

export const metadata = {
  title: "Revenue Summary",
  description: "Summary of revenue from bookings, vouchers and subscriptions"
}

export default async function RevenueSummaryPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-2">
          <PieChart className="h-6 w-6" />
          <Heading
            titleKey="reports.revenueSummary.title"
            descriptionKey="reports.revenueSummary.description"
          />
        </div>
        <Separator />
        <RevenueSummaryClient />
      </div>
    </ScrollArea>
  )
}
