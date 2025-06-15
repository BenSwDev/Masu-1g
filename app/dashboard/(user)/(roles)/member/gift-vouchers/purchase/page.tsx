import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import { getPaymentMethods } from "@/actions/payment-method-actions"
import UnifiedGiftVoucherWizard from "@/components/gift-vouchers/unified-gift-voucher-wizard"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function PurchaseGiftVoucherPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/auth/login")
  }

  const treatmentsResult = await getTreatmentsForSelection()
  const paymentMethodsResult = await getPaymentMethods()

  if (!treatmentsResult.success || !paymentMethodsResult.success) {
    console.error("Failed to load data for voucher purchase:", treatmentsResult.error, paymentMethodsResult.error)
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading title="Purchase Gift Voucher" description="Select and purchase a gift voucher." />
        <Separator />
        <UnifiedGiftVoucherWizard
          treatments={treatmentsResult.treatments || []}
          initialPaymentMethods={paymentMethodsResult.paymentMethods || []}
          currentUser={session.user}
        />
      </div>
    </ScrollArea>
  )
}
