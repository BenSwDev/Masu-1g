import type { Metadata } from "next"
import { getAllGiftVouchers } from "@/actions/gift-voucher-actions"
import GiftVouchersClient from "@/components/dashboard/admin/gift-vouchers/gift-vouchers-client"
import { RoleProtectedRoute } from "@/components/auth/role-protected-route"
import { UserRole } from "@/lib/db/models/user"

export const metadata: Metadata = {
  title: "Gift Vouchers Management",
  description: "Manage gift vouchers for your business",
}

export default async function GiftVouchersPage() {
  const { success, giftVouchers, message } = await getAllGiftVouchers()

  return (
    <RoleProtectedRoute allowedRoles={[UserRole.ADMIN]}>
      <div className="container mx-auto py-6 space-y-6">
        <GiftVouchersClient initialVouchers={success ? giftVouchers : []} error={success ? null : message} />
      </div>
    </RoleProtectedRoute>
  )
}
