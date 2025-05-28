import type { Metadata } from "next"
import { getAllCoupons } from "@/actions/coupon-actions"
import CouponsClient from "@/components/dashboard/admin/coupons/coupons-client"
import { RoleProtectedRoute } from "@/components/auth/role-protected-route"
import { UserRole } from "@/lib/db/models/user"

export const metadata: Metadata = {
  title: "Coupons Management",
  description: "Manage discount coupons for your business",
}

export default async function CouponsPage() {
  const { success, coupons, message } = await getAllCoupons()

  return (
    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <div className="container mx-auto py-6 space-y-6">
        <CouponsClient initialCoupons={success ? coupons : []} error={success ? null : message} />
      </div>
    </RoleProtectedRoute>
  )
}
