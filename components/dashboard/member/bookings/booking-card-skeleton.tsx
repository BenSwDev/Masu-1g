import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader, CardFooter } from "@/components/common/ui/card"

export default function BookingCardSkeleton() {
  return (
    <Card className="overflow-hidden shadow-lg bg-white dark:bg-gray-800">
      <CardHeader className="p-4 border-b dark:border-gray-700">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-3/5" />
          <Skeleton className="h-6 w-1/4" />
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-3/5" />
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <Skeleton className="h-5 w-5 rounded-full" />
          <Skeleton className="h-4 w-2/5" />
        </div>
      </CardContent>
      <CardFooter className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
        <Skeleton className="h-9 w-24" />
      </CardFooter>
    </Card>
  )
}
