"use client"

import { Badge } from "@/components/ui/badge"

import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { updateWeeklyHours } from "@/actions/working-hours-actions"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { useToast } from "@/components/common/ui/use-toast"
import { Loader2, Info, SaveIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import { Card, CardContent, CardHeader } from "@/components/common/ui/card"
import type { ClientWorkingHours } from "@/lib/db/models/working-hours"

type WeeklyHourItemClient = ClientWorkingHours["weeklyHours"][0]

interface WeeklyHoursSectionProps {
  weeklyHours: WeeklyHourItemClient[]
  onRefresh: () => void
}

const defaultHourConfig: Omit<WeeklyHourItemClient, "day" | "_id"> = {
  isActive: false,
  startTime: "09:00",
  endTime: "17:00",
  priceAdjustment: undefined,
}

export function WeeklyHoursSection({ weeklyHours: initialWeeklyHours, onRefresh }: WeeklyHoursSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hours, setHours] = useState<WeeklyHourItemClient[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  const initializeHours = useCallback(() => {
    const daysOfWeek = [0, 1, 2, 3, 4, 5, 6] // Sunday to Saturday
    const initialized = daysOfWeek.map((dayIndex) => {
      const existingDay = initialWeeklyHours.find((h) => h.day === dayIndex)
      return existingDay
        ? { ...existingDay, priceAdjustment: existingDay.priceAdjustment || undefined }
        : { day: dayIndex, ...defaultHourConfig, _id: undefined }
    })
    setHours(initialized.sort((a, b) => a.day - b.day))
    setHasChanges(false)
  }, [initialWeeklyHours])

  useEffect(() => {
    initializeHours()
  }, [initializeHours])

  const handleFieldChange = (day: number, field: keyof WeeklyHourItemClient, value: any) => {
    setHours((prevHours) => prevHours.map((hour) => (hour.day === day ? { ...hour, [field]: value } : hour)))
    setHasChanges(true)
  }

  const handlePriceAdjustmentChange = (
    day: number,
    field: keyof NonNullable<WeeklyHourItemClient["priceAdjustment"]>,
    value: string | number,
  ) => {
    setHours((prevHours) =>
      prevHours.map((hour) => {
        if (hour.day === day) {
          const currentAdjustment = hour.priceAdjustment || { type: "fixed", value: 0, reason: "" }
          return {
            ...hour,
            priceAdjustment: {
              ...currentAdjustment,
              [field]: field === "value" ? Number(value) : value,
            },
          }
        }
        return hour
      }),
    )
    setHasChanges(true)
  }

  const handleTogglePriceAdjustment = (day: number, checked: boolean) => {
    setHours((prevHours) =>
      prevHours.map((hour) => {
        if (hour.day === day) {
          return {
            ...hour,
            priceAdjustment: checked ? hour.priceAdjustment || { type: "fixed", value: 0, reason: "" } : undefined,
          }
        }
        return hour
      }),
    )
    setHasChanges(true)
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      // Filter out _id from priceAdjustment if it exists (it shouldn't based on model)
      const hoursToSubmit = hours.map((h) => {
        const { _id, ...restOfHour } = h // Exclude _id from top level of each hour item for update
        if (restOfHour.priceAdjustment) {
          const { _id: paId, ...restOfPa } = restOfHour.priceAdjustment as any // Mongoose might add _id to subdocs
          return { ...restOfHour, priceAdjustment: Object.keys(restOfPa).length > 0 ? restOfPa : undefined }
        }
        return { ...restOfHour, priceAdjustment: undefined }
      })

      const result = await updateWeeklyHours(hoursToSubmit as any) // Cast as server expects IWorkingHours structure
      if (result.success) {
        toast({ title: t("common.success"), description: t("workingHours.updateSuccess"), variant: "success" })
        onRefresh()
        setHasChanges(false)
      } else {
        throw new Error(result.error || t("workingHours.updateError"))
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("workingHours.updateError"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const timeOptions = generateTimeOptions()

  if (hours.length === 0) {
    return (
      <div className="flex items-center justify-center p-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="ml-2 text-muted-foreground">{t("common.loading")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {hours.map((hour) => (
        <Card key={hour.day} className={`transition-all ${hour.isActive ? "bg-card" : "bg-muted/50"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="flex items-center gap-3">
              <Switch
                checked={hour.isActive}
                onCheckedChange={(checked) => {
                  handleFieldChange(hour.day, "isActive", checked)
                  if (!checked) {
                    // If deactivated, also remove price adjustment
                    handleTogglePriceAdjustment(hour.day, false)
                  }
                }}
                id={`day-active-${hour.day}`}
              />
              <label htmlFor={`day-active-${hour.day}`} className="text-xl font-semibold">
                {t(`workingHours.days.${hour.day}`)}
              </label>
            </div>
            <Badge variant={hour.isActive ? "default" : "outline"}>
              {hour.isActive ? t("workingHours.weekly.open") : t("workingHours.weekly.closed")}
            </Badge>
          </CardHeader>
          {hour.isActive && (
            <CardContent className="space-y-4 pt-0">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("workingHours.common.from")}</label>
                  <Select
                    value={hour.startTime}
                    onValueChange={(value) => handleFieldChange(hour.day, "startTime", value)}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`start-${hour.day}-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">{t("workingHours.common.to")}</label>
                  <Select
                    value={hour.endTime}
                    onValueChange={(value) => handleFieldChange(hour.day, "endTime", value)}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions
                        .filter((time) => time > hour.startTime)
                        .map((time) => (
                          <SelectItem key={`end-${hour.day}-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {hour.endTime <= hour.startTime && (
                    <p className="text-xs text-red-500 mt-1">
                      {t("workingHours.specialDate.errors.endTimeAfterStart")}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <Switch
                    checked={!!hour.priceAdjustment}
                    onCheckedChange={(checked) => handleTogglePriceAdjustment(hour.day, checked)}
                    id={`price-adj-active-${hour.day}`}
                  />
                  <label htmlFor={`price-adj-active-${hour.day}`} className="text-sm font-medium">
                    {t("workingHours.priceAdjustment.toggleLabel")}
                  </label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{t("workingHours.priceAdjustment.tooltipInfo")}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {hour.priceAdjustment && (
                  <div className="grid grid-cols-1 gap-4 rounded-md border bg-background p-4 md:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {t("workingHours.priceAdjustment.type")}
                      </label>
                      <Select
                        value={hour.priceAdjustment.type || "fixed"}
                        onValueChange={(value) => handlePriceAdjustmentChange(hour.day, "type", value)}
                        dir={t("common.dir") as "ltr" | "rtl" | undefined}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fixed">{t("workingHours.priceAdjustment.types.fixed")}</SelectItem>
                          <SelectItem value="percentage">
                            {t("workingHours.priceAdjustment.types.percentage")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {t("workingHours.priceAdjustment.value")} (
                        {hour.priceAdjustment.type === "percentage" ? "%" : t("common.currency")})
                      </label>
                      <Input
                        type="number"
                        value={hour.priceAdjustment.value || 0}
                        onChange={(e) => handlePriceAdjustmentChange(hour.day, "value", e.target.value)}
                        min="0"
                      />
                      {Number(hour.priceAdjustment.value) < 0 && (
                        <p className="text-xs text-red-500 mt-1">
                          {t("workingHours.priceAdjustment.errors.valueNegative")}
                        </p>
                      )}
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        {t("workingHours.priceAdjustment.reason")}
                      </label>
                      <Textarea
                        value={hour.priceAdjustment.reason || ""}
                        onChange={(e) => handlePriceAdjustmentChange(hour.day, "reason", e.target.value)}
                        rows={2}
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSubmit} disabled={isSubmitting || !hasChanges}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <SaveIcon className="mr-2 h-4 w-4" />
          {t("common.save")}
        </Button>
      </div>
    </div>
  )
}

function generateTimeOptions() {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      // 15-minute intervals
      options.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`)
    }
  }
  return options
}
