import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { ProfessionalManagement } from "@/components/dashboard/admin/professional-management/professional-management"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getProfessionals } from "./actions"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'


export const metadata: Metadata = {
  title: "ניהול מטפלים | מנהל",
  description: "ניהול מטפלים במערכת",
}

function ProfessionalsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Statistics Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-8 w-16" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Filters Skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
        </CardContent>
      </Card>
      
      {/* Table Skeleton */}
      <Card>
        <CardContent className="p-0">
          <div className="border rounded-lg">
            <div className="p-4 border-b">
              <div className="flex gap-4">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
            
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b last:border-b-0">
                <div className="flex gap-4 items-center">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function ProfessionalsPageContent() {
  try {
    // טען נתונים ראשוניים
    const initialData = await getProfessionals({
      page: 1,
      limit: 10,
      search: "",
    })

    if (!initialData.success) {
      throw new Error(initialData.error || "Failed to load professionals")
    }

    return (
      <ProfessionalManagement 
        initialProfessionals={initialData.data?.professionals || []}
        totalPages={initialData.data?.pagination.pages || 1}
        currentPage={initialData.data?.pagination.page || 1}
        initialSearch=""
        initialStats={initialData.data?.stats}
      />
    )
  } catch (error) {
    console.error("Error loading professionals:", error)
    // במקרה של שגיאה, חזור לקומפוננט עם נתונים ריקים
    return (
      <ProfessionalManagement 
        initialProfessionals={[]}
        totalPages={1}
        currentPage={1}
        initialSearch=""
        initialStats={{ total: 0, active: 0, byStatus: {} }}
      />
    )
  }
}

export default async function ProfessionalsPage() {
  const session = await requireUserSession()
  
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ניהול מטפלים</h1>
          <p className="text-muted-foreground">
            ניהול מטפלים במערכת - צפייה, עריכה ואישור מטפלים
          </p>
        </div>
      </div>

      <Suspense fallback={<ProfessionalsLoadingSkeleton />}>
        <ProfessionalsPageContent />
      </Suspense>
    </div>
  )
} 
