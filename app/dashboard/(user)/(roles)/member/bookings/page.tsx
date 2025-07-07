import { Suspense } from "react"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"
import { Metadata } from "next"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = 'force-dynamic'
import EnhancedMemberBookingsClient from "@/components/dashboard/member/bookings/enhanced-member-bookings-client"

export const metadata: Metadata = {
  title: "ההזמנות שלי | מסו",
  description: "צפה בכל ההזמנות שלך, עקוב אחר הסטטוס ונהל את הטיפולים"
}

export default async function MemberBookingsPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto py-6">
      <Suspense fallback={
        <div className="space-y-6">
          <div className="text-center">
            <div className="h-8 w-48 bg-gray-200 rounded mx-auto mb-2 animate-pulse"></div>
            <div className="h-4 w-32 bg-gray-200 rounded mx-auto animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      }>
        <EnhancedMemberBookingsClient userId={session.user.id} />
      </Suspense>
    </div>
  )
}
