"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { updateWeeklyHours } from "@/actions/working-hours-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { useToast } from "@/components/common/ui/use-toast"
import { Loader2, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import type { IWorkingHours } from "@/lib/db/models/working-hours" // Ensure this type is correctly defined and imported

type WeeklyHourConfig = IWorkingHours["weeklyHours"][0] & { _id?: string } // Allow _id for client-side keying if needed

interface WeeklyHoursSectionProps {
  weeklyHours: WeeklyHourConfig[]
  onRefresh: () => void
}

const defaultWeeklyHoursTemplate: Omit<WeeklyHourConfig, "_id">[] = [
  { day: 0, isActive: false, startTime: "09:00", endTime: "17:00" }, // Sunday
  { day: 1, isActive: true, startTime: "09:00", endTime: "17:00" }, // Monday
  { day: 2, isActive: true, startTime: "09:00", endTime: "17:00" }, // Tuesday
  { day: 3, isActive: true, startTime: "09:00", endTime: "17:00" }, // Wednesday
  { day: 4, isActive: true, startTime: "09:00", endTime: "17:00" }, // Thursday
  { day: 5, isActive: true, startTime: "09:00", endTime: "14:00" }, // Friday
  { day: 6, isActive: false, startTime: "09:00", endTime: "17:00" }, // Saturday
]

export function WeeklyHoursSection({ weeklyHours, onRefresh }: WeeklyHoursSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hours, setHours] = useState<WeeklyHourConfig[]>([])

  useEffect(() => {
    if (weeklyHours && weeklyHours.length > 0) {
      const formattedHours = defaultWeeklyHoursTemplate.map((defaultHour) => {
        const dbHour = weeklyHours.find((h) => h.day === defaultHour.day)
        if (dbHour) {
          return {
            ...defaultHour,
            ...dbHour,
            // Ensure priceAdjustment is well-formed or undefined
            priceAdjustment: dbHour.priceAdjustment
              ? {
                  type: dbHour.priceAdjustment.type || "fixed",
                  value: dbHour.priceAdjustment.value || 0,
                  reason: dbHour.priceAdjustment.reason || "",
                }
              : undefined, // Explicitly undefined if not present or incomplete
          }
        }
        return { ...defaultHour, priceAdjustment: undefined } // Ensure priceAdjustment is defined for new entries
      })
      setHours(formattedHours.sort((a, b) => a.day - b.day))
    } else {
      setHours(
        defaultWeeklyHoursTemplate.map((h) => ({ ...h, priceAdjustment: undefined })).sort((a, b) => a.day - b.day),
      )
    }
  }, [weeklyHours])

  const handleToggleDay = (day: number, isActive: boolean) => {
    setHours((prevHours) =>
      prevHours.map((hour) =>
        hour.day === day
          ? {
              ...hour,
              isActive,
              priceAdjustment: isActive ? hour.priceAdjustment : undefined, // Clear adjustment if day becomes inactive
            }
          : hour,
      ),
    )
  }

  const handleTimeChange = (day: number, field: "startTime" | "endTime", value: string) => {
    setHours((prevHours) => prevHours.map((hour) => (hour.day === day ? { ...hour, [field]: value } : hour)))
  }

  const handlePriceAdjustmentChange = (
    day: number,
    field: keyof NonNullable<WeeklyHourConfig["priceAdjustment"]>,
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
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      // Prepare data for submission, removing client-side _id if present
      const hoursToSubmit = hours.map(({ _id, ...h }) => {
        if (!h.isActive) {
          return { ...h, priceAdjustment: undefined, isActive: false, startTime: "00:00", endTime: "00:00" } // Reset times for inactive
        }
        if (h.priceAdjustment && h.priceAdjustment.value > 0) {
          return h
        }
        return { ...h, priceAdjustment: undefined }
      })

      const result = await updateWeeklyHours(hoursToSubmit as IWorkingHours["weeklyHours"])
      if (result.success) {
        toast({
          title: t("workingHours.updateSuccess"),
          variant: "success",
        })
        onRefresh()
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

  const timeOptions = useMemo(() => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const formattedHour = hour.toString().padStart(2, "0")
        const formattedMinute = minute.toString().padStart(2, "0")
        options.push(`${formattedHour}:${formattedMinute}`)
      }
    }
    return options
  }, [])

  if (hours.length === 0 && !weeklyHours) {
    // Distinguish initial load from empty configured hours
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">{t("common.loading")}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("workingHours.weeklyHours")}</CardTitle>
        <CardDescription>{t("workingHours.weeklyDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {hours.map((hour) => (
            <div key={hour.day} className="p-4 border rounded-md space-y-4 bg-muted/20 dark:bg-muted/30">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <Switch
                    checked={hour.isActive}
                    onCheckedChange={(checked) => handleToggleDay(hour.day, checked)}
                    id={`day-active-${hour.day}`}
                    aria-label={`${t(`workingHours.days.${hour.day}`)} ${t("common.active")}`}
                  />
                  <label
                    htmlFor={`day-active-${hour.day}`}
                    className="text-md font-semibold cursor-pointer min-w-[80px]"
                  >
                    {t(`workingHours.days.${hour.day}`)}
                  </label>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto">
                  <Select
                    value={hour.startTime}
                    onValueChange={(value) => handleTimeChange(hour.day, "startTime", value)}
                    disabled={!hour.isActive}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger className="w-full sm:w-[120px] md:w-36">
                      <SelectValue placeholder={t("workingHours.selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`start-${hour.day}-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm self-center px-1">-</span>
                  <Select
                    value={hour.endTime}
                    onValueChange={(value) => handleTimeChange(hour.day, "endTime", value)}
                    disabled={!hour.isActive}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger className="w-full sm:w-[120px] md:w-36">
                      <SelectValue placeholder={t("workingHours.selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions
                        .filter((time) => time > hour.startTime || time === "00:00") // Allow 00:00 for next day
                        .map((time) => (
                          <SelectItem key={`end-${hour.day}-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {hour.isActive && (
                <div className="space-y-3 pt-3 border-t dark:border-slate-700">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Switch
                      checked={!!hour.priceAdjustment}
                      onCheckedChange={(checked) => handleTogglePriceAdjustment(hour.day, checked)}
                      id={`price-adj-active-${hour.day}`}
                      aria-label={t("workingHours.priceAdjustment.toggleLabel")}
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
                          <p>{t("workingHours.priceAdjustment.weeklyTooltipInfo")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {hour.priceAdjustment && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-md bg-background dark:bg-slate-800 dark:border-slate-700">
                      <div>
                        <label
                          htmlFor={`price-adj-type-${hour.day}`}
                          className="block text-sm font-medium text-muted-foreground mb-1"
                        >
                          {t("workingHours.priceAdjustment.type")}
                        </label>
                        <Select
                          value={hour.priceAdjustment?.type || "fixed"}
                          onValueChange={(value) => handlePriceAdjustmentChange(hour.day, "type", value)}
                          dir={t("common.dir") as "ltr" | "rtl" | undefined}
                        >
                          <SelectTrigger id={`price-adj-type-${hour.day}`}>
                            <SelectValue placeholder={t("workingHours.priceAdjustment.selectTypePlaceholder")} />
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
                        <label
                          htmlFor={`price-adj-value-${hour.day}`}
                          className="block text-sm font-medium text-muted-foreground mb-1"
                        >
                          {t("workingHours.priceAdjustment.value")} (
                          {hour.priceAdjustment?.type === "percentage" ? "%" : t("common.currencySymbol")})
                        </label>
                        <Input
                          id={`price-adj-value-${hour.day}`}
                          type="number"
                          value={hour.priceAdjustment?.value || 0}
                          onChange={(e) => handlePriceAdjustmentChange(hour.day, "value", e.target.value)}
                          placeholder={t("workingHours.priceAdjustment.valuePlaceholder")}
                          min="0"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label
                          htmlFor={`price-adj-reason-${hour.day}`}
                          className="block text-sm font-medium text-muted-foreground mb-1"
                        >
                          {t("workingHours.priceAdjustment.reason")} ({t("common.optional")})
                        </label>
                        <Textarea
                          id={`price-adj-reason-${hour.day}`}
                          value={hour.priceAdjustment?.reason || ""}
                          onChange={(e) => handlePriceAdjustmentChange(hour.day, "reason", e.target.value)}
                          placeholder={t("workingHours.priceAdjustment.reasonPlaceholder")}
                          rows={2}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end mt-6">
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin rtl:ml-2 rtl:mr-0" />}
              {t("common.saveChanges")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
