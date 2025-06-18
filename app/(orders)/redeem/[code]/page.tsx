import { getGiftVoucherByCode } from "@/actions/gift-voucher-actions"
import RedeemPageContent from "./redeem-page-content"

interface Params { code: string }

export default async function RedeemPage({ params }: { params: Params }) {
  const result = await getGiftVoucherByCode(params.code)
  const voucher = result.success && result.voucher ? result.voucher : null
  return <RedeemPageContent voucher={voucher} code={params.code} />
}

