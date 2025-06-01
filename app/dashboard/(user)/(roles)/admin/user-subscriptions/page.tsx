import { Suspense } from "react"
import { getAllUserSubscriptions } from "@/actions/user-management-actions"
import AdminUserSubscriptionsClient from "@/components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"

// הגדרת הדף כדינמי
export const dynamic = "force-dynamic"

// קומפוננטת טעינה משופרת
function UserSubscriptionsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
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
                {Array(5)
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
    </div>
  )
}

// קומפוננטת טעינת נתונים
async function UserSubscriptionsData() {
  try {
    const result = await getAllUserSubscriptions({
      page: 1,
      limit: 10,
    })

    if (!result.success) {
      return (
        <div className="p-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-40 p-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">שגיאה בטעינת הנתונים</h3>
                <p className="text-gray-500 dark:text-gray-400">{result.error || "אירעה שגיאה לא צפויה"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="p-6">
        <AdminUserSubscriptionsClient
          initialUserSubscriptions={result.userSubscriptions || []}
          initialPagination={result.pagination}
        />
      </div>
    )
  } catch (error) {
    console.error("Error loading user subscriptions:", error)
    return (
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-6 h-6 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">שגיאה בטעינת הנתונים</h3>
              <p className="text-gray-500 dark:text-gray-400">אירעה שגיאה בטעינת מנויי המשתמשים</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }
}

export default function AdminUserSubscriptionsPage() {
  return (
    <Suspense fallback={<UserSubscriptionsLoading />}>
      <UserSubscriptionsData />
    </Suspense>
  )
}
