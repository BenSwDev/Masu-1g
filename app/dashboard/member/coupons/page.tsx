import type { Metadata } from "next"
import { getUserCoupons } from "@/actions/coupon-actions"
import MemberCouponsClient from "@/components/dashboard/member/coupons/member-coupons-client"
import { RoleProtectedRoute } from "@/components/auth/role-protected-route"
import { UserRole } from "@/lib/db/models/user"

export const metadata: Metadata = {
  title: "My Coupons",
  description: "View and manage your discount coupons",
}

export default async function MemberCouponsPage() {
  const { success, coupons, message } = await getUserCoupons()

  return (
    <RoleProtectedRoute allowedRoles={[UserRole.MEMBER]}>
      <div className="container mx-auto py-6 space-y-6">
        <MemberCouponsClient initialCoupons={success ? coupons : []} error={success ? null : message} />
      </div>
    </RoleProtectedRoute>
  )
}
