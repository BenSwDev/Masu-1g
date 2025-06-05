import { Card, CardContent, CardHeader, CardFooter } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"

export function BookingCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-lg transition-shadow hover:shadow-xl">
      <CardHeader className="bg-muted/30 p-4">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="mt-1 h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </CardContent>
      <CardFooter className="flex items-center justify-between bg-muted/30 p-4">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </CardFooter>
    </Card>
  )
}

export function MemberBookingsClientSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <BookingCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
