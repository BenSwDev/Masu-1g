import { redirect } from "next/navigation"
import { requireUserSession } from "@/lib/auth/require-session"
import { getCities } from "./actions"
import { CityManagement } from "@/components/dashboard/admin/city-management/city-management"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Separator } from "@/components/common/ui/separator"
import { CitiesHeading } from "@/components/dashboard/admin/city-management/cities-heading"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "ניהול ערים",
  description: "ניהול רשימת הערים הזמינות לשירות"
}

interface AdminCitiesPageProps {
  searchParams: Promise<{ page?: string; search?: string }>
}

export default async function AdminCitiesPage({ searchParams }: AdminCitiesPageProps) {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  const params = await searchParams
  const page = Number.parseInt(params.page || "1")
  const search = params.search || ""
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
