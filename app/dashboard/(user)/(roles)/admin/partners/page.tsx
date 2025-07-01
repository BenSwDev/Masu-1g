import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { PartnerManagement } from "@/components/dashboard/admin/partner-management/partner-management"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getPartners } from "./actions"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "× ×™×”×•×œ ×©×•×ª×¤×™× | ×ž× ×”×œ",
  description: "× ×™×”×•×œ ×©×•×ª×¤×™× ×‘×ž×¢×¨×›×ª",
}

function PartnersLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

async function PartnersPageContent() {
  const initialData = await getPartners({ page: 1, limit: 10, search: "" })
  if (!initialData.success) {
    return <p className="text-center text-red-500">×©×’×™××” ×‘×˜×¢×™× ×ª ×”×©×•×ª×¤×™×</p>
  }
  return (
    <PartnerManagement
      initialPartners={(initialData.data?.partners as any[]) || []}
      totalPages={initialData.data?.pagination.pages || 1}
      currentPage={initialData.data?.pagination.page || 1}
      initialSearch=""
    />
  )
}

export default async function AdminPartnersPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">× ×™×”×•×œ ×©×•×ª×¤×™×</h1>
          <p className="text-muted-foreground">× ×™×”×•×œ ×•×¦×¤×™×™×” ×‘×¨×©×™×ž×ª ×”×©×•×ª×¤×™× ×‘×ž×¢×¨×›×ª</p>
        </div>
      </div>
      <Suspense fallback={<PartnersLoadingSkeleton />}>
        {" "}
        <PartnersPageContent />{" "}
      </Suspense>
    </div>
  )
}


