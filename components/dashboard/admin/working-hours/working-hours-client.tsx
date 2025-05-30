"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getWorkingHoursData } from "@/actions/working-hours-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { WeeklyHoursSection } from "./weekly-hours-section"
import { SpecialDatesSection } from "./special-dates-section"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { AlertTriangleIcon } from "lucide-react"
import type { ClientWorkingHours } from "@/lib/db/models/working-hours"

interface WorkingHoursClientProps {
  initialWorkingHours: ClientWorkingHours | null
  initialError?: string | null
}

export function WorkingHoursClient({ initialWorkingHours, initialError }: WorkingHoursClientProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("weekly")

  const {
    data: workingHoursData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<
    { success: boolean; data?: ClientWorkingHours | null; error?: string },
    Error,
    ClientWorkingHours | null
  >({
    queryKey: ["workingHours"],
    queryFn: async () => {
      const result = await getWorkingHoursData()
      if (!result.success || !result.data) {
        throw new Error(result.error || t("workingHours.fetchError"))
      }
      return result.data
    },
    initialData: initialWorkingHours, // Use server-fetched data as initial data
    enabled: !initialWorkingHours, // Only fetch if initialData is not provided
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["workingHours"] })
  }

  const currentError = initialError || (isError ? (error as Error)?.message || t("workingHours.fetchError") : null)

  if (isLoading && !initialWorkingHours) {
    return (
      <div className="container mx-auto p-4 space-y-6">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <Skeleton className="h-12 w-1/4 mb-6" />
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-40 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (currentError && !workingHoursData) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertTitle>{t("common.error")}</AlertTitle>
          <AlertDescription>{currentError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const dataToUse = workingHoursData || initialWorkingHours

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-2">{t("workingHours.title")}</h1>
      <p className="text-muted-foreground mb-6">{t("workingHours.description")}</p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 md:w-1/2">
          <TabsTrigger value="weekly">{t("workingHours.weeklyHours")}</TabsTrigger>
          <TabsTrigger value="special">{t("workingHours.specialDates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>{t("workingHours.weeklyHours")}</CardTitle>
              <CardDescription>{t("workingHours.tabs.weeklyHours.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {dataToUse ? (
                <WeeklyHoursSection weeklyHours={dataToUse.weeklyHours || []} onRefresh={handleRefresh} />
              ) : (
                <p>{t("common.loading")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="special" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle>{t("workingHours.specialDates")}</CardTitle>
              <CardDescription>{t("workingHours.tabs.specialDates.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              {dataToUse ? (
                <SpecialDatesSection
                  specialDates={dataToUse.specialDates || []}
                  weeklyHours={dataToUse.weeklyHours || []} // Pass weeklyHours for default time display
                  onRefresh={handleRefresh}
                />
              ) : (
                <p>{t("common.loading")}</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
