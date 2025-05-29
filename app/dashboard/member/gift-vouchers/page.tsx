import { getMemberOwnedVouchers, getMemberPurchasedVouchers } from "@/actions/gift-voucher-actions"
import MemberGiftVouchersClient from "@/components/dashboard/member/gift-vouchers/member-gift-vouchers-client"

async function MemberGiftVouchersData() {
  const [ownedResult, purchasedResult] = await Promise.all([getMemberOwnedVouchers(), getMemberPurchasedVouchers()])

  if (!ownedResult.success && !purchasedResult.success) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-md">
        Error: {ownedResult.error || purchasedResult.error || "Unknown error"}
      </div>
    )
  }

  return (
    <MemberGiftVouchersClient
      initialOwnedVouchers={ownedResult.success ? ownedResult.giftVouchers : []}
      initialPurchasedVouchers={purchasedResult.success ? purchasedResult.giftVouchers : []}
    />
  )
}

export default async function Page() {
  return <MemberGiftVouchersData />
}
