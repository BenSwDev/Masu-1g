import { getTreatmentsForSelection } from "@/app/(orders)/purchase/gift-voucher/actions"
import type { SerializedTreatment } from "@/app/(orders)/purchase/gift-voucher/actions"
import type { ITreatment } from "@/lib/db/models/treatment"
import GuestGiftVoucherWizard from "@/components/gift-vouchers/guest-gift-voucher-wizard"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Heading } from "@/components/ui/heading"
import { Separator } from "@/components/ui/separator"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth/auth"
import { redirect } from "next/navigation"

// Force dynamic rendering to prevent build-time database connections
export const dynamic = "force-dynamic"

// Convert serialized treatment to ITreatment
function convertToTreatment(treatment: SerializedTreatment): ITreatment {
  return {
    ...treatment,
    _id: treatment._id as any,
    durations: treatment.durations?.map(d => ({
      ...d,
      _id: d._id as any,
    })),
    createdAt: new Date(treatment.createdAt),
    updatedAt: new Date(treatment.updatedAt),
  } as ITreatment
}

export default async function PurchaseGiftVoucherPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    redirect("/auth/login")
  }

  const treatmentsResult = await getTreatmentsForSelection()

  if (!treatmentsResult.success) {
    console.error("Failed to load treatments for voucher purchase:", treatmentsResult.error)
  }

  const treatments: ITreatment[] = treatmentsResult.treatments?.map(convertToTreatment) || []

  return (
    <ScrollArea className="h-full">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <Heading title="Purchase Gift Voucher" description="Select and purchase a gift voucher." />
        <Separator />
        <GuestGiftVoucherWizard treatments={treatments} currentUser={session.user} />
      </div>
    </ScrollArea>
  )
}
