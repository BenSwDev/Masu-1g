import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'
import { getPaymentMethods } from "@/actions/payment-method-actions"
import { PaymentMethodsClient } from "@/components/dashboard/member/payment-methods/payment-methods-client"

export default async function MemberPaymentMethodsPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/auth/login")
  }

  if (session.user.activeRole !== "member") {
    redirect("/dashboard")
  }

  const result = await getPaymentMethods()

  if (!result.success) {
    return <div className="p-4 bg-red-50 text-red-600 rounded-md">Error: {result.error}</div>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">ניהול אמצעי תשלום</h1>
        <p className="text-gray-600">ניהול אמצעי התשלום שלך.</p>
      </div>

      <PaymentMethodsClient initialPaymentMethods={result.paymentMethods || []} />
    </div>
  )
}
