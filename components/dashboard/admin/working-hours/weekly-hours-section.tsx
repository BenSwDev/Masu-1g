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
import { Loader2, Info, ClockIcon } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import { cn } from "@/lib/utils/utils"

interface WeeklyHoursSectionProps {
  weeklyHours: any[]
  onRefresh: () => void
}

interface HourConfig {
  day: number
  isActive: boolean
  startTime: string
  endTime: string
  hasPriceAdjustment: boolean
  priceAdjustment?: {
    type: "percentage" | "fixed"
    value: number
    reason?: string
  }
}

const defaultWeeklyHours: HourConfig[] = [
  { day: 0, isActive: false, startTime: "09:00", endTime: "17:00", hasPriceAdjustment: false }, // Sunday
  { day: 1, isActive: true, startTime: "09:00", endTime: "17:00", hasPriceAdjustment: false }, // Monday
  { day: 2, isActive: true, startTime: "09:00", endTime: "17:00", hasPriceAdjustment: false }, // Tuesday
  { day: 3, isActive: true, startTime: "09:00", endTime: "17:00", hasPriceAdjustment: false }, // Wednesday
  { day: 4, isActive: true, startTime: "09:00", endTime: "17:00", hasPriceAdjustment: false }, // Thursday
  { day: 5, isActive: true, startTime: "09:00", endTime: "14:00", hasPriceAdjustment: false }, // Friday
  { day: 6, isActive: false, startTime: "09:00", endTime: "17:00", hasPriceAdjustment: false }, // Saturday
]

export function WeeklyHoursSection({ weeklyHours, onRefresh }: WeeklyHoursSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hours, setHours] = useState<HourConfig[]>([])

  useEffect(() => {
    if (weeklyHours && weeklyHours.length > 0) {
      const formattedHours = defaultWeeklyHours.map((defaultHour) => {
        const dbHour = weeklyHours.find((h) => h.day === defaultHour.day)
        if (dbHour) {
          return {
            ...defaultHour,
            ...dbHour,
            _id: undefined,
            hasPriceAdjustment: !!dbHour.priceAdjustment,
            priceAdjustment: dbHour.priceAdjustment
              ? {
                  type: dbHour.priceAdjustment.type || "fixed",
                  value: dbHour.priceAdjustment.value || 0,
                  reason: dbHour.priceAdjustment.reason || "",
                }
              : { type: "fixed", value: 0, reason: "" },
          }
        }
        return defaultHour
      })
      setHours(formattedHours.sort((a, b) => a.day - b.day))
    } else {
      setHours(defaultWeeklyHours.sort((a, b) => a.day - b.day))
    }
  }, [weeklyHours])

  const handleToggleDay = (day: number, isActive: boolean) => {
    setHours(
      hours.map((hour) =>
        hour.day === day ? { ...hour, isActive, hasPriceAdjustment: isActive ? hour.hasPriceAdjustment : false } : hour,
      ),
    )
  }

  const handleTimeChange = (day: number, field: "startTime" | "endTime", value: string) => {
    setHours(hours.map((hour) => (hour.day === day ? { ...hour, [field]: value } : hour)))
  }

  const handlePriceAdjustmentChange = (
    day: number,
    field: keyof NonNullable<HourConfig["priceAdjustment"]>,
    value: string | number,
  ) => {
    setHours(
      hours.map((hour) => {
        if (hour.day === day) {
          const currentAdjustment = hour.priceAdjustment || { type: "fixed", value: 0, reason: "" }
          return {
            ...hour,
            priceAdjustment: {
              ...currentAdjustment,
              [field]: field === "value" ? Number.parseFloat(String(value)) || 0 : value,
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
      const hoursToSubmit = hours.map((h) => {
        const { hasPriceAdjustment, ...rest } = h
        if (!h.isActive) {
          return { ...rest, priceAdjustment: undefined, isActive: false }
        }
        return {
          ...rest,
          priceAdjustment:
            hasPriceAdjustment && h.priceAdjustment && h.priceAdjustment.value > 0 ? h.priceAdjustment : undefined,
        }
      })
      await updateWeeklyHours(hoursToSubmit)
      toast({
        title: t("common.success"),
        description: t("workingHours.updateSuccess"),
        variant: "success",
      })
      onRefresh()
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

  if (hours.length === 0) {
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
            <Card
              key={hour.day}
              className={cn("p-4 transition-all", hour.isActive ? "bg-card" : "bg-muted/50 opacity-70")}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <Switch
                    checked={hour.isActive}
                    onCheckedChange={(checked) => handleToggleDay(hour.day, checked)}
                    id={`day-active-${hour.day}`}
                    aria-label={`${t(`workingHours.days.${hour.day}`)} ${t("common.active")}`}
                  />
                  <label
                    htmlFor={`day-active-${hour.day}`}
                    className="text-lg font-semibold cursor-pointer min-w-[80px]"
                  >
                    {t(`workingHours.days.${hour.day}`)}
                  </label>
                </div>

                <div
                  className={cn(
                    "flex flex-col sm:flex-row items-center gap-2 sm:gap-4 transition-opacity",
                    !hour.isActive && "opacity-50 pointer-events-none",
                  )}
                >
                  <ClockIcon className="h-5 w-5 text-muted-foreground hidden sm:block" />
                  <Select
                    value={hour.startTime}
                    onValueChange={(value) => handleTimeChange(hour.day, "startTime", value)}
                    disabled={!hour.isActive}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger className="w-full sm:w-32">
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

                  <span className="text-muted-foreground">-</span>

                  <Select
                    value={hour.endTime}
                    onValueChange={(value) => handleTimeChange(hour.day, "endTime", value)}
                    disabled={!hour.isActive}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue placeholder={t("workingHours.selectTime")} />
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
                </div>
              </div>

              {hour.isActive && (
                <div className="mt-4 pt-4 border-t border-dashed space-y-3">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Switch
                      checked={hour.hasPriceAdjustment}
                      onCheckedChange={(checked) => handleTogglePriceAdjustment(hour.day, checked)}
                      id={`price-adj-active-${hour.day}`}
                      aria-label={t("workingHours.priceAdjustment.toggleLabel")}
                    />
                    <label htmlFor={`price-adj-active-${hour.day}`} className="text-sm font-medium cursor-pointer">
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-md bg-background shadow-sm">
                      <div>
                        <label
                          htmlFor={`price-adj-type-${hour.day}`}
                          className="block text-xs font-medium text-muted-foreground mb-1"
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
                          className="block text-xs font-medium text-muted-foreground mb-1"
                        >
                          {t("workingHours.priceAdjustment.value")} (
                          {hour.priceAdjustment?.type === "percentage" ? "%" : t("common.currency")})
                        </label>
                        <Input
                          id={`price-adj-value-${hour.day}`}
                          type="number"
                          value={hour.priceAdjustment?.value || 0}
                          onChange={(e) => handlePriceAdjustmentChange(hour.day, "value", e.target.value)}
                          placeholder={t("workingHours.priceAdjustment.valuePlaceholder")}
                          min="0"
                          step="any"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label
                          htmlFor={`price-adj-reason-${hour.day}`}
                          className="block text-xs font-medium text-muted-foreground mb-1"
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
            </Card>
          ))}

          <div className="flex justify-end mt-8">
            <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
              {isSubmitting && <Loader2 className="mr-2 rtl:ml-2 h-4 w-4 animate-spin" />}
              {t("common.save")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function generateTimeOptions() {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      options.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return options
}
