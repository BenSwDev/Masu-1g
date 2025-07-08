import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"
import { Button } from "@/components/common/ui/button"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import AdminDailyTransactionsClient from "@/components/dashboard/admin/transactions/admin-daily-transactions-client"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

interface AdminDailyTransactionsPageProps {
  params: Promise<{
    date: string
  }>
}

export default async function AdminDailyTransactionsPage({
  params
}: AdminDailyTransactionsPageProps) {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const { date } = await params
  
  // Validate date format (YYYY-MM-DD)
  const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date)
  if (!isValidDate) {
    redirect("/dashboard/admin/transactions")
  }

  const formattedDate = new Date(date).toLocaleDateString("he-IL", {
    weekday: "long",
    year: "numeric", 
    month: "long",
    day: "numeric"
  })

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <Heading
            title={`פירוט עסקאות יומי - ${formattedDate}`}
            description="רשימה מפורטת של כל העסקאות שבוצעו באותו יום"
          />
          <Button asChild variant="outline">
            <Link href="/dashboard/admin/transactions">
              חזרה לדוח השבועי
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Separator />

        <AdminDailyTransactionsClient date={date} />
      </div>
    </ScrollArea>
  )
} 