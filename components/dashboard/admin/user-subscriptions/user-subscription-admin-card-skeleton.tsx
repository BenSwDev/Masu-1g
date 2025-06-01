import { Card, CardContent, CardHeader, CardFooter } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"

export default function UserSubscriptionAdminCardSkeleton() {
  return (
    <Card className="shadow-md">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <Skeleton className="h-6 w-32 mb-1" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-2 w-full" />
        </div>
        <Skeleton className="h-4 w-32" />
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-4">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </CardFooter>
    </Card>
  )
}
