"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getWorkingHours } from "@/actions/working-hours-actions"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { WeeklyHoursSection } from "./weekly-hours-section"
import { SpecialDatesSection } from "./special-dates-section"
import { Skeleton } from "@/components/common/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/common/ui/alert"
import { AlertTriangle } from "lucide-react"

export function WorkingHoursClient() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("weekly")

  const {
    data: workingHoursQueryResult, // Renamed to avoid conflict with variable 'workingHours'
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["workingHours"],
    queryFn: async () => {
      const result = await getWorkingHours()
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch working hours")
      }
      return result.data // Return only data part
    },
  })

  // Use queryResult for data, default to empty structure if undefined
  const workingHours = workingHoursQueryResult || {
    weeklyHours: [],
    specialDates: [],
  }

  const renderLoadingSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-8 w-1/2 mb-2" />
        <Skeleton className="h-4 w-3/4" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-4 border rounded-md space-y-3">
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </CardContent>
    </Card>
  )

  const renderErrorState = () => (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{t("common.error")}</AlertTitle>
      <AlertDescription>{error instanceof Error ? error.message : t("workingHours.fetchError")}</AlertDescription>
    </Alert>
  )

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("workingHours.title")}</h1>
        <p className="text-muted-foreground">{t("workingHours.description")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
          <TabsTrigger value="weekly">{t("workingHours.weeklyHours")}</TabsTrigger>
          <TabsTrigger value="special">{t("workingHours.specialDates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-0">
          {isLoading ? (
            renderLoadingSkeleton()
          ) : isError ? (
            renderErrorState()
          ) : (
            <WeeklyHoursSection weeklyHours={workingHours.weeklyHours} onRefresh={refetch} />
          )}
        </TabsContent>

        <TabsContent value="special" className="mt-0">
          {isLoading ? (
            renderLoadingSkeleton()
          ) : isError ? (
            renderErrorState()
          ) : (
            <SpecialDatesSection
              specialDates={workingHours.specialDates}
              weeklyHours={workingHours.weeklyHours} // Pass weeklyHours here
              onRefresh={refetch}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
