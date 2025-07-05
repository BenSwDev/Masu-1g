import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { ProfessionalManagement, ProfessionalManagementLoading } from "@/components/dashboard/admin/professional-management/ProfessionalManagement"
import { getProfessionals } from "./actions"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'


export const metadata: Metadata = {
  title: "ניהול מטפלים | מנהל",
  description: "ניהול מטפלים במערכת",
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

    // Transform database types to Professional interface
    const transformedProfessionals = initialData.data?.professionals.map(professional => {
      const prof = professional as any
      return {
        ...prof,
        _id: prof._id.toString(),
        userId: typeof prof.userId === 'object' ? {
          ...prof.userId,
          _id: prof.userId._id.toString()
        } : prof.userId
      }
    }) || []

    return (
      <ProfessionalManagement 
        initialProfessionals={transformedProfessionals}
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

      <Suspense fallback={<ProfessionalManagementLoading />}>
        <ProfessionalsPageContent />
      </Suspense>
    </div>
  )
} 