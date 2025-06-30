import { getTreatmentsForSelection } from "@/app/(orders)/purchase/gift-voucher/actions"
import GuestGiftVoucherWizard from "@/components/gift-vouchers/guest-gift-voucher-wizard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = "force-dynamic"

export default async function PurchaseGiftVoucherPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/auth/login")
  }

  const treatmentsResult = await getTreatmentsForSelection()

  if (!treatmentsResult.success) {
    console.error("Failed to load treatments for voucher purchase:", treatmentsResult.error)
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading title="Purchase Gift Voucher" description="Select and purchase a gift voucher." />
        <Separator />
        <GuestGiftVoucherWizard treatments={treatmentsResult.treatments || []} />
      </div>
    </ScrollArea>
  )
}
