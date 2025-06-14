import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAllUserSubscriptions } from "@/actions/user-subscription-actions"
import AdminUserSubscriptionsClient from "@/components/dashboard/admin/user-subscriptions/admin-user-subscriptions-client"
import { Card, CardContent } from "@/components/common/ui/card"
import ClientAwareUserSubscriptionsLoading from "./client-aware-user-subscriptions-loading" // New component
import { requireUserSession } from "@/lib/auth/require-session"

export const dynamic = "force-dynamic"

// Error component for data fetching failure
function DataFetchError({ error }: { error?: string }) {
  // This component cannot use useTranslation directly as it's rendered by an async component.
  // Translations for such static error messages should be passed as props or handled differently if dynamic.
  // For simplicity, using hardcoded English text or very generic keys.
  // Ideally, the parent async component would fetch translations if needed.
  const defaultError = "An unexpected error occurred while loading data."
  const errorTitle = "Error Loading Data"

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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">{errorTitle}</h3>
            <p className="text-gray-500 dark:text-gray-400">{error || defaultError}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

async function UserSubscriptionsData() {
  try {
    // Fetch initial data for the first page
    const result = await getAllUserSubscriptions({
      page: 1,
      limit: 10, // Default limit
    })

    if (!result.success) {
      // Using a generic error message key that should exist
      return <DataFetchError error={result.error || "Failed to load user subscriptions."} />
    }

    // Pass initial data to the client component
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
    // Using a generic error message key
    return <DataFetchError error={"An unexpected error occurred while fetching user subscriptions."} />
  }
}

export default async function AdminUserSubscriptionsPage() {
  const session = await requireUserSession()
  if (!session.user.roles?.includes("admin")) {
    redirect("/dashboard")
  }

  return (
    <Suspense fallback={<ClientAwareUserSubscriptionsLoading />}>
      <UserSubscriptionsData />
    </Suspense>
  )
}
