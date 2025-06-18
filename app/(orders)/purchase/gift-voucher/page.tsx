import { getTreatmentsForSelection } from "./actions"
import type { SerializedTreatment } from "./actions"
import type { ITreatment } from "@/lib/db/models/treatment"
import GuestGiftVoucherWizard from "@/components/gift-vouchers/guest-gift-voucher-wizard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { GuestLayout } from "@/components/layout/guest-layout"
import { useTranslation } from "@/lib/translations/i18n"

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

interface GuestGiftVoucherPageContentProps {
  success: boolean
  treatments: ITreatment[]
}

function GuestGiftVoucherPageContent({ success, treatments }: GuestGiftVoucherPageContentProps) {
  "use client"
  const { t, language, dir } = useTranslation()

  if (!success) {
    return (
      <GuestLayout>
        <Card className="max-w-xl mx-auto mt-10 p-4" dir={dir} lang={language}>
          <CardHeader>
            <CardTitle>{t("common.dataLoadError")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("common.tryAgain")}</p>
          </CardContent>
        </Card>
      </GuestLayout>
    )
  }

  return (
    <GuestLayout>
      <GuestGiftVoucherWizard treatments={treatments} />
    </GuestLayout>
  )
}
