"use client"

import WorkingHoursClient from "@/components/dashboard/admin/working-hours/working-hours-client"
import { updateWorkingHoursSettingsAction } from "@/actions/working-hours-actions" // Import actions

interface WorkingHoursClientPageProps {
  initialValues: any
  t: any
}

export default function WorkingHoursClientPage({ initialValues, t }: WorkingHoursClientPageProps) {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">{t("title")}</h1>
      <WorkingHoursClient initialValues={initialValues} onSubmit={updateWorkingHoursSettingsAction} />
    </div>
  )
}
