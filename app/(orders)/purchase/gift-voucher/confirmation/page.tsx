import { Suspense } from "react"
import { notFound } from "next/navigation"
import GuestGiftVoucherConfirmation from "@/components/gift-vouchers/guest-gift-voucher-confirmation"
import { GuestLayout } from "@/components/layout/guest-layout"
import { getGiftVoucherById } from "@/actions/gift-voucher-actions"
import dbConnect from "@/lib/db/mongoose"

interface SearchParams {
  voucherId?: string
  status?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

// Get actual voucher data from database
async function getGiftVoucherData(voucherId: string) {
  try {
    await dbConnect()
    const result = await getGiftVoucherById(voucherId)
    
    if (!result.success || !result.voucher) {
      return null
    }

    return result.voucher
  } catch (error) {
    console.error("Error fetching gift voucher data:", error)
    return null
  }
}

export default async function GiftVoucherConfirmationPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const { voucherId, status } = resolvedSearchParams

  if (!voucherId || status !== "success") {
    notFound()
  }

  const voucher = await getGiftVoucherData(voucherId)

  if (!voucher) {
    notFound()
  }

  return (
    <GuestLayout>
      <Suspense fallback={<div>טוען...</div>}>
        <GuestGiftVoucherConfirmation voucher={voucher} />
      </Suspense>
    </GuestLayout>
  )
} 