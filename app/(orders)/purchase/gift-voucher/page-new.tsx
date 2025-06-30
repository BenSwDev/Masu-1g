import { getTreatmentsForSelection } from "./actions"
import type { SerializedTreatment } from "./actions"
import type { ITreatment } from "@/lib/db/models/treatment"
import SimplifiedGiftVoucherWizard from "./simplified-gift-voucher-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"

// Force dynamic rendering for database access
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

export default async function GuestBookGiftVoucherPageNew() {
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

  const treatments: ITreatment[] = treatmentsResult.treatments?.map(convertToTreatment) || []

  return (
    <GuestLayout>
      <SimplifiedGiftVoucherWizard treatments={treatments} />
    </GuestLayout>
  )
}
