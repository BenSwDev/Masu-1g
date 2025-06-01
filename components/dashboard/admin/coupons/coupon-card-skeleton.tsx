"use client"

import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"

export function CouponCardSkeleton() {
  return (
    <Card className="w-full shadow-md">
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-8 w-8 rounded-full" />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </CardContent>
    </Card>
  )
}
