import { GuestLayout } from "@/components/layout/guest-layout"
import { Suspense } from "react"
import dynamic from "next/dynamic"

// Dynamic import for the heavy wizard component
const SimplifiedSubscriptionWizard = dynamic(() => import("./simplified-subscription-wizard"), {
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
  ssr: false
})

// Force dynamic rendering
export const dynamic = 'force-dynamic'

export default function PurchaseSubscriptionPageNew() {
  return (
    <GuestLayout>
      <Suspense fallback={
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }>
        <SimplifiedSubscriptionWizard />
      </Suspense>
    </GuestLayout>
  )
}
