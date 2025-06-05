import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getUserBookings } from "@/actions/booking-actions"
import MemberBookingsClient from "@/components/dashboard/member/bookings/member-bookings-client"
import BookingsLoadingSkeleton from "@/components/dashboard/member/bookings/bookings-loading-skeleton"
import { getTranslations } from "next-intl/server" // For server component translations

interface MemberBookingsPageProps {
  searchParams: {
    page?: string
    limit?: string
    status?: string | string[]
    sortBy?: string
    sortDirection?: "asc" | "desc"
    dateFrom?: string
    dateTo?: string
  }
}

export default async function MemberBookingsPage({ searchParams }: MemberBookingsPageProps) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/login")
  }
  if (session.user.activeRole !== "member") {
    redirect("/dashboard")
  }

  const t = await getTranslations({ locale: session.user.locale || "en", namespace: "memberBookings" })
  const commonT = await getTranslations({ locale: session.user.locale || "en", namespace: "common" })

  const page = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1
  const limit = searchParams.limit ? Number.parseInt(searchParams.limit, 10) : 10

  let statusArray: string[] = []
  if (searchParams.status) {
    statusArray = Array.isArray(searchParams.status) ? searchParams.status : [searchParams.status]
  }

  const bookingsData = await getUserBookings({
    userId: session.user.id,
    page,
    limit,
    status: statusArray,
    sortBy: searchParams.sortBy,
    sortDirection: searchParams.sortDirection,
    dateFrom: searchParams.dateFrom,
    dateTo: searchParams.dateTo,
  })

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">{t("title")}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{t("description")}</p>
        </div>
      </div>
      <Suspense fallback={<BookingsLoadingSkeleton />}>
        <MemberBookingsClient
          initialBookings={bookingsData.success ? bookingsData.bookings || [] : []}
          totalBookings={bookingsData.success ? bookingsData.totalBookings || 0 : 0}
          totalPages={bookingsData.success ? bookingsData.totalPages || 0 : 0}
          initialError={bookingsData.success ? undefined : bookingsData.error}
          searchParams={searchParams}
        />
      </Suspense>
    </div>
  )
}
