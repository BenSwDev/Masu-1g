"use client"

import { Button } from "@/components/common/ui/button" // Corrected path
import { useQuery } from "@tanstack/react-query"
import { getWorkingHours } from "@/actions/working-hours-actions"
import { WeeklyHoursSection } from "./weekly-hours-section"
import { SpecialDatesSection } from "./special-dates-section"
// SpecialDateForm is now typically managed within SpecialDatesSection or as a separate modal triggered by it.
// If WorkingHoursClient needs to manage it directly, ensure named import:
// import { SpecialDateForm } from "./special-date-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Loader2 } from "lucide-react"
import type { IWorkingHours } from "@/lib/db/models/working-hours" // ISpecialDate added

// Changed to named export
export function WorkingHoursClient() {
  const { t } = useTranslation()
  // State for managing SpecialDateForm if it were handled here.
  // const [isSpecialDateFormOpen, setIsSpecialDateFormOpen] = useState(false);
  // const [editingSpecialDate, setEditingSpecialDate] = useState<ISpecialDate | null>(null);

  const {
    data: workingHoursData,
    isLoading,
    error,
    refetch,
  } = useQuery<IWorkingHours, Error>({
    queryKey: ["workingHours"],
    queryFn: async () => {
      const result = await getWorkingHours()
      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to fetch working hours")
      }
      return result.data
    },
  })

  // Handlers for SpecialDateForm if managed here
  /*
  const handleOpenNewSpecialDateForm = () => {
    setEditingSpecialDate(null);
    setIsSpecialDateFormOpen(true);
  };

  const handleEditSpecialDate = (date: ISpecialDate) => {
    setEditingSpecialDate(date);
    setIsSpecialDateFormOpen(true);
  };

  const handleSpecialDateFormClose = () => {
    setIsSpecialDateFormOpen(false);
    setEditingSpecialDate(null);
    refetch(); 
  };
  */

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="sr-only">{t("common.loading")}</span>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-destructive">{t("common.error")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t("workingHours.fetchError")}</p>
          <pre className="mt-2 text-sm text-muted-foreground bg-muted p-2 rounded">{error.message}</pre>
          <Button onClick={() => refetch()} className="mt-4">
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!workingHoursData) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("common.noData")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t("workingHours.noData")}</p>
          <Button onClick={() => refetch()} className="mt-4">
            {t("common.retry")}
          </Button>
        </CardContent>
      </Card>
    )
  }

  /*
  // If SpecialDateForm is to be rendered here instead of inside SpecialDatesSection
  if (isSpecialDateFormOpen) {
    return (
      <SpecialDateForm
        specialDate={editingSpecialDate || undefined} // Ensure ISpecialDate matches the prop type
        weeklyHours={workingHoursData.weeklyHours}
        onSuccess={handleSpecialDateFormClose}
        onCancel={handleSpecialDateFormClose}
      />
    );
  }
  */

  return (
    <Tabs defaultValue="weekly" className="space-y-4">
      <TabsList>
        <TabsTrigger value="weekly">{t("workingHours.weeklyHours")}</TabsTrigger>
        <TabsTrigger value="special">{t("workingHours.specialDates")}</TabsTrigger>
      </TabsList>
      <TabsContent value="weekly">
        <WeeklyHoursSection weeklyHours={workingHoursData.weeklyHours} onRefresh={refetch} />
      </TabsContent>
      <TabsContent value="special">
        <SpecialDatesSection
          specialDates={workingHoursData.specialDates}
          weeklyHours={workingHoursData.weeklyHours}
          onRefresh={refetch}
        />
      </TabsContent>
    </Tabs>
  )
}
