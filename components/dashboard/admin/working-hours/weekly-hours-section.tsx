"use client"

import { useState, useEffect } from "react"
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
import type { ClientWeeklyHourConfig, ClientPriceAdjustment } from "./types"
import type { WeeklyHourConfig as DbWeeklyHourConfig } from "@/lib/db/models/working-hours" // For payload

/**
 * @interface WeeklyHoursSectionProps
 * @description Props for the WeeklyHoursSection component.
 * @property {ClientWeeklyHourConfig[]} weeklyHours - The current weekly hours configuration.
 * @property {() => void} onRefresh - Callback function to refresh the working hours data.
 */
interface WeeklyHoursSectionProps {
  weeklyHours: ClientWeeklyHourConfig[]
  onRefresh: () => void
}

const defaultClientWeeklyHours: ClientWeeklyHourConfig[] = [
  {
    day: 0,
    isActive: false,
    startTime: "09:00",
    endTime: "17:00",
    hasPriceAdjustment: false,
    priceAdjustment: undefined,
  }, // Sunday
  {
    day: 1,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    hasPriceAdjustment: false,
    priceAdjustment: undefined,
  }, // Monday
  {
    day: 2,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    hasPriceAdjustment: false,
    priceAdjustment: undefined,
  }, // Tuesday
  {
    day: 3,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    hasPriceAdjustment: false,
    priceAdjustment: undefined,
  }, // Wednesday
  {
    day: 4,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    hasPriceAdjustment: false,
    priceAdjustment: undefined,
  }, // Thursday
  {
    day: 5,
    isActive: true,
    startTime: "09:00",
    endTime: "14:00",
    hasPriceAdjustment: false,
    priceAdjustment: undefined,
  }, // Friday
  {
    day: 6,
    isActive: false,
    startTime: "09:00",
    endTime: "17:00",
    hasPriceAdjustment: false,
    priceAdjustment: undefined,
  }, // Saturday
]

/**
 * @component WeeklyHoursSection
 * @description Component for managing standard weekly working hours and associated price adjustments.
 * Allows users to activate/deactivate days, set start/end times, and configure price adjustments.
 */
export function WeeklyHoursSection({ weeklyHours, onRefresh }: WeeklyHoursSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hours, setHours] = useState<ClientWeeklyHourConfig[]>([])

  useEffect(() => {
    if (weeklyHours && weeklyHours.length > 0) {
      // Map provided weeklyHours to ensure all days are present and correctly formatted
      const formattedHours = defaultClientWeeklyHours.map((defaultHour) => {
        const dbHour = weeklyHours.find((h) => h.day === defaultHour.day)
        if (dbHour) {
          return {
            ...dbHour, // dbHour is already ClientWeeklyHourConfig
            // Ensure priceAdjustment structure is initialized if hasPriceAdjustment is true but priceAdjustment is missing
            priceAdjustment:
              dbHour.hasPriceAdjustment && !dbHour.priceAdjustment
                ? { type: "fixed", value: 0, reason: "" }
                : dbHour.priceAdjustment,
          }
        }
        return defaultHour
      })
      setHours(formattedHours.sort((a, b) => a.day - b.day))
    } else {
      // If no weeklyHours provided, initialize with defaults
      setHours(defaultClientWeeklyHours.sort((a, b) => a.day - b.day))
    }
  }, [weeklyHours])

  const handleToggleDay = (day: number, isActive: boolean) => {
    setHours(
      hours.map((hour) =>
        hour.day === day
          ? {
              ...hour,
              isActive,
              // If day becomes inactive, also reset hasPriceAdjustment and clear priceAdjustment details
              hasPriceAdjustment: isActive ? hour.hasPriceAdjustment : false,
              priceAdjustment: isActive ? hour.priceAdjustment : undefined,
            }
          : hour,
      ),
    )
  }

  const handleTimeChange = (day: number, field: "startTime" | "endTime", value: string) => {
    setHours(hours.map((hour) => (hour.day === day ? { ...hour, [field]: value } : hour)))
  }

  const handlePriceAdjustmentChange = (day: number, field: keyof ClientPriceAdjustment, value: string | number) => {
    setHours(
      hours.map((hour) => {
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
    setHours(
      hours.map((hour) => {
        if (hour.day === day) {
          return {
            ...hour,
            hasPriceAdjustment: checked,
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
      // Prepare payload for the server action, removing UI-specific 'hasPriceAdjustment'
      const hoursToSubmit: Omit<DbWeeklyHourConfig, "_id">[] = hours.map((h) => {
        const { _id, hasPriceAdjustment, ...rest } = h // Exclude _id and hasPriceAdjustment

        let dbPriceAdjustment: ClientPriceAdjustment | undefined = undefined
        if (h.isActive && hasPriceAdjustment && h.priceAdjustment && h.priceAdjustment.value > 0) {
          dbPriceAdjustment = h.priceAdjustment
        }

        return {
          ...rest, // day, isActive, startTime, endTime
          priceAdjustment: dbPriceAdjustment,
        }
      })

      const result = await updateWeeklyHours(hoursToSubmit)
      if (result.success) {
        toast({
          title: t("workingHours.updateSuccess"),
          variant: "success",
        })
        onRefresh()
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("workingHours.updateError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("workingHours.updateError"),
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const timeOptions = generateTimeOptions()

  if (hours.length === 0 && weeklyHours.length > 0) {
    // Still initializing from props
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
            <div key={hour.day} className="p-4 border rounded-md space-y-4 bg-muted/20 dark:bg-muted/50">
              <div className="flex flex-col sm:flex-row-reverse sm:items-center sm:justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 sm:mt-0">
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
                    disabled={!hour.isActive || !hour.startTime}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger className="w-full sm:w-[120px] md:w-36">
                      <SelectValue placeholder={t("workingHours.selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions
                        .filter((time) => !hour.startTime || time > hour.startTime)
                        .map((time) => (
                          <SelectItem key={`end-${hour.day}-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <Switch
                    checked={hour.isActive}
                    onCheckedChange={(checked) => handleToggleDay(hour.day, checked)}
                    id={`day-active-${hour.day}`}
                    aria-label={`${t(`workingHours.days.${hour.day}`)} ${t("common.active")}`}
                  />
                  <label
                    htmlFor={`day-active-${hour.day}`}
                    className="text-md font-semibold cursor-pointer min-w-[80px] text-right rtl:text-left"
                  >
                    {t(`workingHours.days.${hour.day}`)}
                  </label>
                </div>
              </div>

              {hour.isActive && (
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Switch
                      checked={hour.hasPriceAdjustment}
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
                          <p>{t("workingHours.priceAdjustment.tooltipInfo")}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  {hour.hasPriceAdjustment && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-md bg-background dark:bg-muted">
                      <div>
                        <label
                          htmlFor={`price-adj-type-${hour.day}`}
                          className="block text-sm font-medium text-muted-foreground mb-1"
                        >
                          {t("workingHours.priceAdjustment.type")}
                        </label>
                        <Select
                          value={hour.priceAdjustment?.type || "fixed"}
                          onValueChange={(value) =>
                            handlePriceAdjustmentChange(hour.day, "type", value as "fixed" | "percentage")
                          }
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
                          {hour.priceAdjustment?.type === "percentage" ? "%" : t("common.currency")})
                        </label>
                        <Input
                          id={`price-adj-value-${hour.day}`}
                          type="number"
                          value={hour.priceAdjustment?.value || 0}
                          onChange={(e) =>
                            handlePriceAdjustmentChange(hour.day, "value", Number.parseFloat(e.target.value))
                          }
                          placeholder={t("workingHours.priceAdjustment.valuePlaceholder")}
                          min="0"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label
                          htmlFor={`price-adj-reason-${hour.day}`}
                          className="block text-sm font-medium text-muted-foreground mb-1"
                        >
                          {t("workingHours.priceAdjustment.reason")}
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * @function generateTimeOptions
 * @description Generates an array of time strings in HH:MM format at 30-minute intervals.
 * @returns {string[]} An array of time strings.
 */
function generateTimeOptions(): string[] {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      options.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return options
}
