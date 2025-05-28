import { Suspense } from "react"
import { getBundles } from "@/actions/bundle-actions"
import { BundlesClient } from "@/components/dashboard/admin/bundles/bundles-client"
import { Skeleton } from "@/components/common/ui/skeleton"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { getTranslations } from "@/lib/translations/server"

// Get treatments from the database
async function getTreatments() {
  try {
    const { getTreatments } = await import("@/actions/treatment-actions")
    const result = await getTreatments()
    return result.success ? result.treatments : []
  } catch (error) {
    console.error("Error fetching treatments:", error)
    return []
  }
}

// Extract unique categories from treatments
function extractCategories(treatments: any[]): string[] {
  const categories = new Set<string>()
  treatments.forEach((treatment) => {
    if (treatment.category) {
      categories.add(treatment.category)
    }
  })
  return Array.from(categories)
}

export default async function BundlesPage() {
  const { t } = await getTranslations("common")

  // Check authentication and authorization
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login?callbackUrl=/dashboard/admin/bundles")
  }

  const isAdmin = session.user.roles?.includes("admin")
  if (!isAdmin) {
    redirect("/dashboard")
  }

  // Fetch bundles and treatments with error handling
  const [bundlesResult, treatmentsResult] = await Promise.allSettled([getBundles(), getTreatments()])

  const bundles = bundlesResult.status === "fulfilled" && bundlesResult.value.success ? bundlesResult.value.bundles : []

  const treatmentsList = treatmentsResult.status === "fulfilled" ? treatmentsResult.value : []

  const categories = extractCategories(treatmentsList)

  return (
    <div className="container px-4 py-6 mx-auto max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-right">{t("admin.bundles.title")}</h1>
        <p className="text-gray-500 text-right">{t("admin.bundles.description")}</p>
      </div>

      <Suspense fallback={<BundlesSkeleton />}>
        <BundlesClient initialBundles={bundles} treatments={treatmentsList} categories={categories} />
      </Suspense>
    </div>
  )
}

function BundlesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-60" />
      </div>

      <div className="flex gap-2">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
      </div>
    </div>
  )
}
