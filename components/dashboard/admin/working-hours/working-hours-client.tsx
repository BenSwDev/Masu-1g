"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "@/lib/translations/i18n"
import { getWorkingHours } from "@/actions/working-hours-actions" // Corrected: Server action
import { Card, CardContent } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { WeeklyHoursSection } from "./weekly-hours-section" // Named import
import { SpecialDatesSection } from "./special-dates-section" // Named import
import { Skeleton } from "@/components/common/ui/skeleton"
import type { IWorkingHours } from "@/lib/db/models/working-hours"

// Define a client-side type for the data structure after serialization
type ClientWorkingHoursData = {
  weeklyHours: (IWorkingHours["weeklyHours"][0] & { _id?: string })[]
  specialDates: (Omit<IWorkingHours["specialDates"][0], "date"> & { _id: string; date: string })[]
}

export function WorkingHoursClient() {
  // Changed to named export
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState("weekly")

  const {
    data: workingHoursResponse, // Rename to avoid conflict if 'data' is destructured
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["workingHoursAdmin"], // Changed queryKey to be more specific
    queryFn: async () => {
      const result = await getWorkingHours()
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch working hours")
      }
      // Ensure the data structure matches ClientWorkingHoursData, especially date serialization
      return result as { success: boolean; data: ClientWorkingHoursData; error?: string }
    },
  })

  const workingHours = workingHoursResponse?.data || {
    weeklyHours: [],
    specialDates: [],
  }

  const renderSkeletons = (count: number) => (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-4">
          {[...Array(count)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border rounded-md">
              <Skeleton className="h-6 w-1/4" />
              <div className="flex space-x-4 rtl:space-x-reverse">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-24" />
              </div>
              <Skeleton className="h-8 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">{t("workingHours.title")}</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="weekly">{t("workingHours.weeklyHours")}</TabsTrigger>
          <TabsTrigger value="special">{t("workingHours.specialDates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-0">
          {isLoading ? (
            renderSkeletons(7)
          ) : isError ? (
            <Card>
              <CardContent className="p-6 text-center text-destructive">{t("common.errorLoadingData")}</CardContent>
            </Card>
          ) : (
            <WeeklyHoursSection weeklyHours={workingHours.weeklyHours} onRefresh={refetch} />
          )}
        </TabsContent>

        <TabsContent value="special" className="mt-0">
          {isLoading ? (
            renderSkeletons(3)
          ) : isError ? (
            <Card>
              <CardContent className="p-6 text-center text-destructive">{t("common.errorLoadingData")}</CardContent>
            </Card>
          ) : (
            <SpecialDatesSection
              specialDates={workingHours.specialDates}
              weeklyHours={workingHours.weeklyHours} // Pass weeklyHours for context
              onRefresh={refetch}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
