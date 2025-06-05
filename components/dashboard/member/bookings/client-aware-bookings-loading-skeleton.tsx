import { BookingCardSkeleton } from "./booking-card-skeleton"
import { Skeleton } from "@/components/common/ui/skeleton"

export function ClientAwareBookingsLoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Skeleton className="h-9 w-48 mb-2 rounded-md" />
          <Skeleton className="h-5 w-72 rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-36 rounded-md" />
          <Skeleton className="h-10 w-32 rounded-md" />
        </div>
      </div>

      <Skeleton className="h-10 w-full md:w-1/2 lg:w-1/3 mb-4 rounded-lg p-1" />

      <div className="space-y-4">
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </div>
    </div>
  )
}
