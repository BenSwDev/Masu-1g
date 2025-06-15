import { Suspense } from "react"
import { getProfessionals } from "@/actions/professional-actions"
import { ProfessionalsManagement } from "@/components/dashboard/admin/professionals/professionals-management"

interface PageProps {
  searchParams: { page?: string; search?: string; status?: string }
}

export default async function ProfessionalsPage({ searchParams }: PageProps) {
  const page = parseInt(searchParams.page || "1")
  const search = searchParams.search || ""
  const status = searchParams.status || ""

  const { professionals, totalPages } = await getProfessionals(page, 10, search, status)

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ניהול מטפלים</h1>
        <p className="text-muted-foreground">נהל את כל המטפלים במערכת</p>
      </div>

      <Suspense fallback={<div>טוען...</div>}>
        <ProfessionalsManagement
          initialProfessionals={professionals}
          totalPages={totalPages}
          currentPage={page}
          initialSearch={search}
          initialStatus={status}
        />
      </Suspense>
    </div>
  )
} 