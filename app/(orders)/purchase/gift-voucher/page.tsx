import { getTreatmentsForSelection } from "./actions"
import type { SerializedTreatment } from "./actions"
import type { ITreatment } from "@/lib/db/models/treatment"
import GuestGiftVoucherPageContent from "./guest-gift-voucher-page-content"

// Force dynamic rendering for database access
export const dynamic = 'force-dynamic'

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

export default async function GuestBookGiftVoucherPage() {
  const treatmentsResult = await getTreatmentsForSelection()

  const treatments: ITreatment[] =
    treatmentsResult.success && treatmentsResult.treatments
      ? treatmentsResult.treatments.map(convertToTreatment)
      : []

  return (
    <GuestGiftVoucherPageContent
      success={treatmentsResult.success}
      treatments={treatments}
    />
  )
}

