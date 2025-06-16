import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { getCities } from "@/actions/city-actions"
import { CityManagement } from "@/components/dashboard/admin/city-management/city-management"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Separator } from "@/components/common/ui/separator"
import { CitiesHeading } from "@/components/dashboard/admin/city-management/cities-heading"

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
        <CitiesHeading />
        <Separator />
        {result.success ? (
          <CityManagement initialCities={result.cities as any} totalPages={result.totalPages} currentPage={page} initialSearch={search} />
        ) : (
          <div className="text-center py-8">
            <p className="text-red-600">שגיאה בטעינת הערים. אנא נסה שוב.</p>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
