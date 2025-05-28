import type { Metadata } from "next"
import { getUserGiftVouchers } from "@/actions/gift-voucher-actions"
import MemberGiftVouchersClient from "@/components/dashboard/member/gift-vouchers/member-gift-vouchers-client"
import { RoleProtectedRoute } from "@/components/auth/role-protected-route"
import { UserRole } from "@/lib/db/models/user"

export const metadata: Metadata = {
  title: "Gift Vouchers",
  description: "Purchase and manage gift vouchers",
}

export default async function MemberGiftVouchersPage() {
  const { success, purchasedVouchers, redeemedVouchers, message } = await getUserGiftVouchers()

  return (
    <RoleProtectedRoute allowedRoles={[UserRole.MEMBER]}>
      <div className="container mx-auto py-6 space-y-6">
        <MemberGiftVouchersClient
          initialPurchasedVouchers={success ? purchasedVouchers : []}
          initialRedeemedVouchers={success ? redeemedVouchers : []}
          error={success ? null : message}
        />
      </div>
    </RoleProtectedRoute>
  )
}
