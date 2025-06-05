import { Card, CardContent, CardHeader, CardFooter } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"

export function BookingCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-lg bg-white border border-gray-200 rounded-xl">
      <CardHeader className="p-4 sm:p-5 bg-gray-50 border-b">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-3/5 rounded-md" />
          <Skeleton className="h-5 w-1/4 rounded-full" />
        </div>
        <Skeleton className="h-4 w-2/5 mt-2 rounded-md" />
      </CardHeader>
      <CardContent className="p-4 sm:p-5 space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-start gap-2.5 p-2.5 bg-slate-100 rounded-lg">
              <Skeleton className="h-5 w-5 rounded-full mt-0.5 flex-shrink-0" />
              <div className="w-full">
                <Skeleton className="h-4 w-1/3 mb-1 rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-px w-full my-3 sm:my-4" />
        <div className="flex items-center gap-2.5 p-2.5 bg-slate-100 rounded-lg">
          <Skeleton className="h-5 w-5 rounded-full flex-shrink-0" />
          <div className="w-full">
            <Skeleton className="h-4 w-1/3 mb-1 rounded-md" />
            <Skeleton className="h-4 w-2/3 rounded-md" />
          </div>
        </div>
        <div className="flex items-start gap-2.5 p-2.5 bg-slate-100 rounded-lg">
          <Skeleton className="h-5 w-5 rounded-full mt-0.5 flex-shrink-0" />
          <div className="w-full">
            <Skeleton className="h-4 w-1/3 mb-1 rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      </CardContent>
      <CardFooter className="p-4 sm:p-5 bg-gray-50 border-t">
        <Skeleton className="h-9 w-full sm:w-1/3 rounded-md" />
      </CardFooter>
    </Card>
  )
}
