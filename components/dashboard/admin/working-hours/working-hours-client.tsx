"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getWorkingHours } from "@/actions/working-hours-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { WeeklyHoursSection } from "./weekly-hours-section"
import { SpecialDatesSection } from "./special-dates-section"
import { Card, CardContent } from "@/components/common/ui/card"
import { Skeleton } from "@/components/common/ui/skeleton"

export function WorkingHoursClient() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("weekly")

  const {
    data: workingHoursData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["workingHours"],
    queryFn: async () => {
      const result = await getWorkingHours()
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch working hours")
      }
      return result
    },
  })

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{t("workingHours.title")}</h1>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="space-y-4">
              {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-6 w-24" />
                  <div className="flex space-x-4">
                    <Skeleton className="h-10 w-32" />
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">{t("workingHours.title")}</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-red-500">{t("common.error")}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const workingHours = workingHoursData?.workingHours || {
    weeklyHours: [],
    specialDates: [],
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("workingHours.title")}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="weekly">{t("workingHours.weeklyHours")}</TabsTrigger>
          <TabsTrigger value="special">{t("workingHours.specialDates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-0">
          <WeeklyHoursSection weeklyHours={workingHours.weeklyHours} onRefresh={refetch} />
        </TabsContent>

        <TabsContent value="special" className="mt-0">
          <SpecialDatesSection specialDates={workingHours.specialDates} onRefresh={refetch} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
