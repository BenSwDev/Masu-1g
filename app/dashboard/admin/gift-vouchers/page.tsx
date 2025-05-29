import { getGiftVouchers } from "@/actions/gift-voucher-actions"
import { GiftVouchersClient } from "@/components/dashboard/admin/gift-vouchers/gift-vouchers-client"

// Define the page as dynamic
export const dynamic = "force-dynamic"
export const revalidate = 0

export default async function GiftVouchersPage() {
  const result = await getGiftVouchers(1, "", true, "all", "all")

  if (!result.success || !result.giftVouchers || !result.pagination) {
    throw new Error(result.error || "Failed to load gift vouchers")
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">שוברי מתנה</h1>
        <p className="text-gray-600">נהל את שוברי המתנה ואת תקופות התוקף שלהם.</p>
      </div>

      <GiftVouchersClient initialVouchers={result.giftVouchers} initialPagination={result.pagination} />
    </div>
  )
}
