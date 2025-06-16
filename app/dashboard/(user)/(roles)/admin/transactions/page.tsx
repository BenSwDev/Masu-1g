import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { BarChart3 } from "lucide-react"
import AdminTransactionsClient from "@/components/dashboard/admin/transactions/admin-transactions-client"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"

export const dynamic = 'force-dynamic'

export default async function AdminTransactionsPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes('admin')) {
    redirect("/dashboard")
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          <Heading
            title="עסקאות"
            description="ניהול עסקאות מערכת וזיכוי/קנס מטפלים"
          />
        </div>
        <Separator />
        <AdminTransactionsClient />
      </div>
    </ScrollArea>
  )
}
