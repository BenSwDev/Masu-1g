"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useIsMobile } from "@/components/ui/use-mobile"
import UserSubscriptionAdminCardSkeleton from "@/components/dashboard/admin/user-subscriptions/user-subscription-admin-card-skeleton"

// Default number of skeleton items to show
const DEFAULT_SKELETON_COUNT = 5

function TableLoadingSkeleton({ count = DEFAULT_SKELETON_COUNT }: { count?: number }) {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <th key={i} className="py-3 px-4 text-right">
                      <Skeleton className="h-4 w-20 float-right" />
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {Array(count)
                .fill(0)
                .map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array(8)
                      .fill(0)
                      .map((_, j) => (
                        <td key={j} className="py-3 px-4">
                          <Skeleton className="h-4 w-full" />
                          {j === 0 && <Skeleton className="h-3 w-3/4 mt-1" />}
                        </td>
                      ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}

function CardListLoadingSkeleton({ count = DEFAULT_SKELETON_COUNT }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <UserSubscriptionAdminCardSkeleton key={i} />
        ))}
    </div>
  )
}

export default function ClientAwareUserSubscriptionsLoading() {
  const isMobile = useIsMobile()

  // Header and filter skeletons are common
  const CommonLoadingSkeletons = () => (
    <>
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-7 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <Skeleton className="h-4 w-16 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div>
              <Skeleton className="h-4 w-20 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    </>
  )

  return (
    <div className="space-y-6 p-6">
      <CommonLoadingSkeletons />
      {isMobile === undefined ? ( // Still determining screen size
        <Skeleton className="h-64 w-full" /> // Generic large skeleton
      ) : isMobile ? (
        <CardListLoadingSkeleton />
      ) : (
        <TableLoadingSkeleton />
      )}
    </div>
  )
}
