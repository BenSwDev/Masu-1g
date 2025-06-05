import { Suspense } from "react"
import { getAdminBookings } from "@/actions/booking-actions"
import AdminBookingsClient from "@/components/dashboard/admin/bookings/admin-bookings-client"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"
import { Skeleton } from "@/components/common/ui/skeleton" // For loading state

// You might want to define a loading component for the client
const BookingsLoadingSkeleton = () => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-1/4" />
    <Skeleton className="h-12 w-full" />
    <div className="space-y-2">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  </div>
)

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  // TODO: Implement proper translation fetching for server components if needed, or pass t function
  // For now, using hardcoded strings or translation keys directly.
  const page = typeof searchParams.page === "string" ? Number(searchParams.page) : 1
  const limit = typeof searchParams.limit === "string" ? Number(searchParams.limit) : 10
  const status = typeof searchParams.status === "string" ? searchParams.status : "all"
  const sortBy = typeof searchParams.sortBy === "string" ? searchParams.sortBy : "bookingDateTime"
  const sortDirection =
    typeof searchParams.sortDirection === "string" ? (searchParams.sortDirection as "asc" | "desc") : "desc"
  const userId = typeof searchParams.userId === "string" ? searchParams.userId : undefined
  const professionalId = typeof searchParams.professionalId === "string" ? searchParams.professionalId : undefined
  const dateFrom = typeof searchParams.dateFrom === "string" ? searchParams.dateFrom : undefined
  const dateTo = typeof searchParams.dateTo === "string" ? searchParams.dateTo : undefined

  // Fetch initial bookings data on the server
  // Error handling should be added here
  const initialBookingsData = await getAdminBookings({
    page,
    limit,
    status,
    sortBy,
    sortDirection,
    userId,
    professionalId,
    dateFrom,
    dateTo,
  })

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <Heading
        title="adminBookingsPage.title" // "Manage Bookings"
        description="adminBookingsPage.description" // "View and manage all bookings in the system."
      />
      <Separator />
      <Suspense fallback={<BookingsLoadingSkeleton />}>
        <AdminBookingsClient
          initialBookings={initialBookingsData.bookings || []}
          initialTotalPages={initialBookingsData.totalPages || 0}
          initialTotalBookings={initialBookingsData.totalBookings || 0}
          errorLoadingBookings={initialBookingsData.error}
        />
      </Suspense>
    </div>
  )
}
