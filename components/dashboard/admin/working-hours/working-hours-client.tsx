"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getWorkingHours } from "@/actions/working-hours-actions"
import { Card, CardContent } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { WeeklyHoursSection } from "./weekly-hours-section"
import { SpecialDatesSection } from "./special-dates-section"
import { Skeleton } from "@/components/common/ui/skeleton"
import type { SerializedWorkingHoursData } from "./types"

/**
 * @component WorkingHoursClient
 * @description Main client component for managing working hours.
 * It uses tabs to switch between weekly hours and special dates management.
 * Fetches working hours data using React Query.
 */
export function WorkingHoursClient() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("weekly")

  const {
    data: queryResult, // Renamed to avoid conflict with workingHours variable
    isLoading,
    isError,
    refetch,
  } = useQuery<{ success: boolean; data?: SerializedWorkingHoursData; error?: string }>({
    queryKey: ["workingHours"],
    queryFn: async () => {
      const result = await getWorkingHours()
      // No need to throw error here, let React Query handle it based on result.success
      return result
    },
  })

  // Handle cases where queryResult or queryResult.data might be undefined
  const workingHours: SerializedWorkingHoursData =
    queryResult?.success && queryResult?.data ? queryResult.data : { weeklyHours: [], specialDates: [] }

  const showLoadingSkeleton = isLoading
  const showErrorState = isError || (queryResult && !queryResult.success)

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("workingHours.title")}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="weekly">{t("workingHours.weeklyHours")}</TabsTrigger>
          <TabsTrigger value="special">{t("workingHours.specialDates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-0">
          {showLoadingSkeleton ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="space-y-4">
                  {[...Array(7)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-md">
                      <Skeleton className="h-6 w-24" />
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Skeleton className="h-10 w-full sm:w-[120px] md:w-36" />
                        <Skeleton className="h-10 w-full sm:w-[120px] md:w-36" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : showErrorState ? (
            <Card>
              <CardContent className="p-6 text-center text-red-500">
                <p>{queryResult?.error || t("common.error")}</p>
              </CardContent>
            </Card>
          ) : (
            <WeeklyHoursSection weeklyHours={workingHours.weeklyHours} onRefresh={refetch} />
          )}
        </TabsContent>

        <TabsContent value="special" className="mt-0">
          {showLoadingSkeleton ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-64 mb-6" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Skeleton className="lg:col-span-1 h-[400px]" />
                  <div className="lg:col-span-2 space-y-4">
                    <Skeleton className="h-6 w-48 mb-4" />
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="h-[200px] w-full rounded-md" />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : showErrorState ? (
            <Card>
              <CardContent className="p-6 text-center text-red-500">
                <p>{queryResult?.error || t("common.error")}</p>
              </CardContent>
            </Card>
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
