import { getTreatmentsForSelection } from "@/actions/gift-voucher-actions"
import { getPaymentMethods } from "@/actions/payment-method-actions" // Import getPaymentMethods
import PurchaseGiftVoucherClient from "@/components/dashboard/member/gift-vouchers/purchase-gift-voucher-client"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Heading } from "@/components/common/ui/heading"
import { Separator } from "@/components/common/ui/separator"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

export default async function PurchaseGiftVoucherPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/auth/login") // Or your login page
  }

  const treatmentsResult = await getTreatmentsForSelection()
  const paymentMethodsResult = await getPaymentMethods() // Fetch payment methods

  if (!treatmentsResult.success || !paymentMethodsResult.success) {
    // Handle error, maybe show an error message to the user
    // For now, just log and pass empty arrays or handle as appropriate
    console.error("Failed to load data for voucher purchase:", treatmentsResult.error, paymentMethodsResult.error)
  }

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading title="Purchase Gift Voucher" description="Select and purchase a gift voucher." />
        <Separator />
        <PurchaseGiftVoucherClient
          treatments={treatmentsResult.treatments || []}
          initialPaymentMethods={paymentMethodsResult.paymentMethods || []} // Pass payment methods
        />
      </div>
    </ScrollArea>
  )
}
