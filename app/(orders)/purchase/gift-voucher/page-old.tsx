import { getTreatmentsForSelection } from "./actions"
import type { SerializedTreatment } from "./actions"
import type { Treatment } from "@/types/core"
import GuestGiftVoucherWizard from "@/components/gift-vouchers/guest-gift-voucher-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"

// Force dynamic rendering for database access
export const dynamic = "force-dynamic"

// Convert serialized treatment to Treatment
function convertToTreatment(treatment: SerializedTreatment): Treatment {
  return {
    ...treatment,
    _id: treatment._id,
    durations: treatment.durations?.map(d => ({
      ...d,
      _id: d._id,
    })),
    createdAt: treatment.createdAt,
    updatedAt: treatment.updatedAt,
  } as Treatment
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

  const treatments: Treatment[] = treatmentsResult.treatments?.map(convertToTreatment) || []

  return (
    <GuestLayout>
      <GuestGiftVoucherWizard treatments={treatments} />
    </GuestLayout>
  )
}
