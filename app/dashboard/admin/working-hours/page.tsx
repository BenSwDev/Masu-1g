import { Heading } from "@/components/common/ui/heading"
import { WorkingHoursClient } from "@/components/dashboard/admin/working-hours/working-hours-client" // Corrected: Named import
import { useTranslation } from "@/lib/translations/i18n"

export default function WorkingHoursPage() {
  const { t } = useTranslation()

  return (
    <div className="flex-1 space-y-4 p-4 pt-6 md:p-8">
      <Heading title={t("workingHours.pageTitle")} description={t("workingHours.pageDescription")} />
      <WorkingHoursClient />
    </div>
  )
}
