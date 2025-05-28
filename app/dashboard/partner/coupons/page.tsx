import type { Metadata } from "next"
import { getPartnerCoupons } from "@/actions/coupon-actions"
import PartnerCouponsClient from "@/components/dashboard/partner/coupons/partner-coupons-client"
import { RoleProtectedRoute } from "@/components/auth/role-protected-route"
import { UserRole } from "@/lib/db/models/user"

export const metadata: Metadata = {
  title: "Partner Coupons",
  description: "View and manage your partner coupons",
}

export default async function PartnerCouponsPage() {
  const { success, coupons, message } = await getPartnerCoupons()

  return (
    <RoleProtectedRoute allowedRoles={[UserRole.PARTNER]}>
      <div className="container mx-auto py-6 space-y-6">
        <PartnerCouponsClient initialCoupons={success ? coupons : []} error={success ? null : message} />
      </div>
    </RoleProtectedRoute>
  )
}
