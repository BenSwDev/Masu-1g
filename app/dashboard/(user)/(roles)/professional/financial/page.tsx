import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import ProfessionalFinancialClient from "@/components/dashboard/professional/financial/professional-financial-client"

export const dynamic = 'force-dynamic'

export default async function ProfessionalFinancialPage() {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/login')
  }
  if (!session.user.roles?.includes('professional')) {
    redirect('/dashboard')
  }

  return (
    <div className="space-y-6">
      <Suspense fallback={
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-sm">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-4 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      }>
        <ProfessionalFinancialClient professionalId={session.user.id} />
      </Suspense>
    </div>
  )
}
