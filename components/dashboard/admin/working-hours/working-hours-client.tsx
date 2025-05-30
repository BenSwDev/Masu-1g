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
import { Heading } from "@/components/common/ui/heading" // Assuming you have a Heading component

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
        throw new Error(result.error || t("workingHours.fetchError"))
      }
      return result
    },
  })

  const workingHours = workingHoursData?.data || {
    weeklyHours: [],
    specialDates: [],
  }

  const renderSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-7 w-48 mb-2" />
        <Skeleton className="h-4 w-full max-w-md" />
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-lg"
          >
            <div className="flex items-center space-x-4">
              <Skeleton className="h-6 w-6 rounded-full" /> {/* For Switch */}
              <Skeleton className="h-6 w-24" /> {/* For Day Label */}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
              <Skeleton className="h-10 w-full sm:w-32" />
              <Skeleton className="h-10 w-full sm:w-32" />
            </div>
          </div>
        ))}
        <div className="flex justify-end mt-6">
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <Heading as="h1" size="2xl" className="mb-8">
        {t("workingHours.title")}
      </Heading>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 lg:w-1/3 mb-6">
          <TabsTrigger value="weekly">{t("workingHours.weeklyHours")}</TabsTrigger>
          <TabsTrigger value="special">{t("workingHours.specialDates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="weekly" className="mt-0">
          {isLoading ? (
            renderSkeleton()
          ) : isError ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-500">
                  {t("common.error")}: {t("workingHours.fetchError")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <WeeklyHoursSection weeklyHours={workingHours.weeklyHours} onRefresh={refetch} />
          )}
        </TabsContent>

        <TabsContent value="special" className="mt-0">
          {isLoading ? (
            renderSkeleton()
          ) : isError ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-red-500">
                  {t("common.error")}: {t("workingHours.fetchError")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <SpecialDatesSection specialDates={workingHours.specialDates} onRefresh={refetch} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
