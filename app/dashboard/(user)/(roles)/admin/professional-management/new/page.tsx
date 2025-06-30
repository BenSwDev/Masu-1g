import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { ProfessionalCreatePage } from "@/components/dashboard/admin/professional-management/professional-create-page"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

// Force dynamic rendering
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "יצירת מטפל חדש | מנהל",
  description: "יצירת מטפל חדש במערכת",
}

function ProfessionalCreateLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>

      {/* Form Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

export default async function ProfessionalCreatePageRoute() {
  const session = await requireUserSession()

  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Suspense fallback={<ProfessionalCreateLoadingSkeleton />}>
        <ProfessionalCreatePage />
      </Suspense>
    </div>
  )
}
