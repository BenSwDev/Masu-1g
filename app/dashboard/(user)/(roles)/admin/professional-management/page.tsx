import { Suspense } from "react"
import { Metadata } from "next"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { ProfessionalManagement } from "@/components/dashboard/admin/professional-management/professional-management"
import { Skeleton } from "@/components/common/ui/skeleton"

export const metadata: Metadata = {
  title: "ניהול מטפלים | מנהל",
  description: "ניהול מטפלים במערכת",
}

function ProfessionalsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-4">
        <div className="flex gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="border rounded-lg">
          <div className="p-4 border-b">
            <div className="flex gap-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
          
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 border-b last:border-b-0">
              <div className="flex gap-4 items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default async function ProfessionalsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user || session.user.activeRole !== "admin") {
    redirect("/auth/login")
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
        <ProfessionalManagement 
          initialProfessionals={[]}
          totalPages={1}
          currentPage={1}
          initialSearch=""
        />
      </Suspense>
    </div>
  )
} 