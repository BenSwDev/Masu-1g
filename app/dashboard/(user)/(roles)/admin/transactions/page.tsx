import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import AdminTransactionsClient from "@/components/dashboard/admin/transactions/admin-transactions-client"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'

export const metadata = {
  title: "דוח עסקאות",
  description: "טבלה שבועית של כל העסקאות והמימושים"
}

export default async function AdminTransactionsPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading
          title="דוח עסקאות"
          description="טבלה שבועית של כל העסקאות והמימושים במערכת"
        />
        <Separator />

        <AdminTransactionsClient />
      </div>
    </ScrollArea>
  )
} 
