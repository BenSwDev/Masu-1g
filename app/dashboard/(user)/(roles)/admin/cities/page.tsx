import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { getCities } from "@/actions/city-actions"
import { CityManagement } from "@/components/dashboard/admin/city-management/city-management"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Separator } from "@/components/common/ui/separator"
import { Heading } from "@/components/common/ui/heading"
import { MapPin } from "lucide-react"

export const dynamic = "force-dynamic"

interface AdminCitiesPageProps {
  searchParams: { page?: string; search?: string }
}

export default async function AdminCitiesPage({ searchParams }: AdminCitiesPageProps) {
  const session = await requireUserSession()
  if (session.user.activeRole !== "admin") {
    redirect("/dashboard")
  }

  const page = Number.parseInt(searchParams.page || "1")
  const search = searchParams.search || ""
  const result = await getCities(page, 10, search)

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading icon={MapPin} titleKey="admin.cities.title" descriptionKey="admin.cities.description" />
        <Separator />
        {result.success && (
          <CityManagement initialCities={result.cities as any} totalPages={result.totalPages} currentPage={page} initialSearch={search} />
        )}
      </div>
    </ScrollArea>
  )
}
