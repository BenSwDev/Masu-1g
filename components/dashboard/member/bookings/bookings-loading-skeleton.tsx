import { Skeleton } from "@/components/common/ui/skeleton"
import BookingCardSkeleton from "./booking-card-skeleton"

export default function BookingsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Skeleton className="h-10 w-full sm:w-40" />
        <Skeleton className="h-10 w-full sm:w-40" />
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <BookingCardSkeleton key={i} />
        ))}
      </div>
      <div className="flex justify-center mt-6">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
