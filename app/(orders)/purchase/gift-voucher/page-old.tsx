import { getTreatmentsForSelection } from "./actions"
import type { SerializedTreatment } from "./actions"
import type { ITreatment } from "@/lib/db/models/treatment"
import GuestGiftVoucherWizard from "@/components/gift-vouchers/guest-gift-voucher-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"

// Force dynamic rendering for database access
export const dynamic = "force-dynamic"

// Convert serialized ITreatment to ITreatment
function convertToITreatment(treatment: SerializedTreatment): ITreatment {
  return {
    ...treatment,
    _id: treatment._id,
    durations: treatment.durations?.map(d => ({
      ...d,
      _id: d._id,
    })),
    createdAt: treatment.createdAt,
    updatedAt: treatment.updatedAt,
  } as unknown as ITreatment
}

export default async function GuestBookGiftVoucherPage() {
  const treatmentsResult = await getTreatmentsForSelection()

  if (!treatmentsResult.success) {
    return (
      <GuestLayout>
        <Card>
          <CardHeader>
            <CardTitle>שגיאה בטעינת הנתונים</CardTitle>
          </CardHeader>
          <CardContent>
            <p>אירעה שגיאה בטעינת הנתונים. אנא נסה שוב מאוחר יותר.</p>
          </CardContent>
        </Card>
      </GuestLayout>
    )
  }

  const treatments: ITreatment[] = treatmentsResult.treatments?.map(convertToITreatment) || []

  return (
    <GuestLayout>
      <GuestGiftVoucherWizard treatments={treatments} currentUser={null} />
    </GuestLayout>
  )
}
