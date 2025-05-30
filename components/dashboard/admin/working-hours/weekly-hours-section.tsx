"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { updateWeeklyHours as updateWeeklyHoursAction } from "@/actions/working-hours-actions" // Corrected import
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Input } from "@/components/common/ui/input"
import { Textarea } from "@/components/common/ui/textarea"
import { useToast } from "@/components/common/ui/use-toast"
import { Loader2, Info, ChevronDown, ChevronUp } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/common/ui/collapsible"
import type { IWeeklyHoursDay } from "@/lib/db/models/working-hours" // Corrected import path

// Adjusted HourConfig to match IWeeklyHoursDay and add client-side state
type HourConfig = IWeeklyHoursDay & {
  hasPriceAdjustment: boolean // Client-side state for managing UI
}

interface WeeklyHoursSectionProps {
  weeklyHours: IWeeklyHoursDay[] // Use IWeeklyHoursDay from model
  onRefresh: () => void
}

const defaultWeeklyHoursData: IWeeklyHoursDay[] = [
  {
    dayOfWeek: 0,
    isActive: false,
    startTime: "09:00",
    endTime: "17:00",
    priceAdjustment: { type: "none", value: 0, reason: "" },
  },
  {
    dayOfWeek: 1,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    priceAdjustment: { type: "none", value: 0, reason: "" },
  },
  {
    dayOfWeek: 2,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    priceAdjustment: { type: "none", value: 0, reason: "" },
  },
  {
    dayOfWeek: 3,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    priceAdjustment: { type: "none", value: 0, reason: "" },
  },
  {
    dayOfWeek: 4,
    isActive: true,
    startTime: "09:00",
    endTime: "17:00",
    priceAdjustment: { type: "none", value: 0, reason: "" },
  },
  {
    dayOfWeek: 5,
    isActive: true,
    startTime: "09:00",
    endTime: "14:00",
    priceAdjustment: { type: "none", value: 0, reason: "" },
  },
  {
    dayOfWeek: 6,
    isActive: false,
    startTime: "09:00",
    endTime: "17:00",
    priceAdjustment: { type: "none", value: 0, reason: "" },
  },
]

// Changed to named export
export function WeeklyHoursSection({ weeklyHours, onRefresh }: WeeklyHoursSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hours, setHours] = useState<HourConfig[]>([])
  const [openPriceAdjustments, setOpenPriceAdjustments] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const initialHours = defaultWeeklyHoursData.map((defaultDay) => {
      const dbDay = weeklyHours.find((h) => h.dayOfWeek === defaultDay.dayOfWeek)
      const effectiveDay = dbDay || defaultDay
      return {
        ...effectiveDay,
        priceAdjustment: effectiveDay.priceAdjustment || { type: "none", value: 0, reason: "" },
        hasPriceAdjustment: !!effectiveDay.priceAdjustment && effectiveDay.priceAdjustment.type !== "none",
      }
    })
    setHours(initialHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek))
  }, [weeklyHours])

  const handleToggleDay = (day: number, isActive: boolean) => {
    setHours(
      hours.map((hour) =>
        hour.dayOfWeek === day
          ? { ...hour, isActive, hasPriceAdjustment: isActive ? hour.hasPriceAdjustment : false }
          : hour,
      ),
    )
  }

  const handleTimeChange = (day: number, field: "startTime" | "endTime", value: string) => {
    setHours(hours.map((hour) => (hour.dayOfWeek === day ? { ...hour, [field]: value } : hour)))
  }

  const handlePriceAdjustmentChange = (
    day: number,
    field: keyof IWeeklyHoursDay["priceAdjustment"],
    value: string | number,
  ) => {
    setHours(
      hours.map((hour) => {
        if (hour.dayOfWeek === day) {
          const currentAdjustment = hour.priceAdjustment || { type: "none", value: 0, reason: "" }
          return {
            ...hour,
            priceAdjustment: {
              ...currentAdjustment,
              // @ts-ignore
              [field]: field === "value" ? Number(value) : value,
            },
          }
        }
        return hour
      }),
    )
  }

  const handleTogglePriceAdjustmentSwitch = (day: number, checked: boolean) => {
    setHours(
      hours.map((hour) => {
        if (hour.dayOfWeek === day) {
          return {
            ...hour,
            hasPriceAdjustment: checked,
            priceAdjustment: checked
              ? hour.priceAdjustment?.type !== "none"
                ? hour.priceAdjustment
                : { type: "fixed", value: 0, reason: "" } // Default to fixed if was none
              : { type: "none", value: 0, reason: "" }, // Set to none if unchecked
          }
        }
        return hour
      }),
    )
    if (checked) {
      setOpenPriceAdjustments((prev) => ({ ...prev, [day]: true }))
    }
  }

  const togglePriceAdjustmentSection = (day: number) => {
    setOpenPriceAdjustments((prev) => ({ ...prev, [day]: !prev[day] }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const hoursToSubmit: IWeeklyHoursDay[] = hours.map((h) => {
      const { hasPriceAdjustment, ...rest } = h
      if (!h.isActive) {
        return { ...rest, priceAdjustment: { type: "none", value: 0, reason: "" }, isActive: false }
      }
      return {
        ...rest,
        priceAdjustment:
          hasPriceAdjustment && h.priceAdjustment && h.priceAdjustment.type !== "none" && h.priceAdjustment.value > 0
            ? h.priceAdjustment
            : { type: "none", value: 0, reason: "" },
      }
    })

    const result = await updateWeeklyHoursAction(hoursToSubmit)
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
    setIsSubmitting(false)
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
            <Collapsible
              key={hour.dayOfWeek}
              open={openPriceAdjustments[hour.dayOfWeek]}
              onOpenChange={() => togglePriceAdjustmentSection(hour.dayOfWeek)}
              className="p-4 border rounded-md space-y-4 bg-card shadow-sm"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
                <div className="flex items-center space-x-3 rtl:space-x-reverse flex-1">
                  <Switch
                    checked={hour.isActive}
                    onCheckedChange={(checked) => handleToggleDay(hour.dayOfWeek, checked)}
                    id={`day-active-${hour.dayOfWeek}`}
                    aria-label={`${t(`workingHours.days.${hour.dayOfWeek}`)} ${t("common.active")}`}
                  />
                  <label
                    htmlFor={`day-active-${hour.dayOfWeek}`}
                    className="text-lg font-semibold cursor-pointer min-w-[80px]"
                  >
                    {t(`workingHours.days.${hour.dayOfWeek}`)}
                  </label>
                </div>

                <div
                  className={`flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 sm:mt-0 w-full sm:w-auto transition-opacity duration-300 ${hour.isActive ? "opacity-100" : "opacity-50 pointer-events-none"}`}
                >
                  <Select
                    value={hour.startTime}
                    onValueChange={(value) => handleTimeChange(hour.dayOfWeek, "startTime", value)}
                    disabled={!hour.isActive}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger className="w-full sm:w-[120px] md:w-36">
                      <SelectValue placeholder={t("workingHours.selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions.map((time) => (
                        <SelectItem key={`start-${hour.dayOfWeek}-${time}`} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-sm self-center px-1">-</span>

                  <Select
                    value={hour.endTime}
                    onValueChange={(value) => handleTimeChange(hour.dayOfWeek, "endTime", value)}
                    disabled={!hour.isActive}
                    dir={t("common.dir") as "ltr" | "rtl" | undefined}
                  >
                    <SelectTrigger className="w-full sm:w-[120px] md:w-36">
                      <SelectValue placeholder={t("workingHours.selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions
                        .filter((time) => time > hour.startTime)
                        .map((time) => (
                          <SelectItem key={`end-${hour.dayOfWeek}-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <CollapsibleTrigger asChild className={!hour.isActive ? "pointer-events-none opacity-50" : ""}>
                  <Button variant="ghost" size="sm" disabled={!hour.isActive}>
                    {t("workingHours.priceAdjustment.title")}
                    {openPriceAdjustments[hour.dayOfWeek] ? (
                      <ChevronUp className="h-4 w-4 ml-2 rtl:mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 ml-2 rtl:mr-2" />
                    )}
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent className={`space-y-3 pt-3 border-t mt-3 ${!hour.isActive ? "hidden" : ""}`}>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Switch
                    checked={hour.hasPriceAdjustment}
                    onCheckedChange={(checked) => handleTogglePriceAdjustmentSwitch(hour.dayOfWeek, checked)}
                    id={`price-adj-active-${hour.dayOfWeek}`}
                    aria-label={t("workingHours.priceAdjustment.toggleLabel")}
                    disabled={!hour.isActive}
                  />
                  <label htmlFor={`price-adj-active-${hour.dayOfWeek}`} className="text-sm font-medium">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 border rounded-md bg-background">
                    <div>
                      <label
                        htmlFor={`price-adj-type-${hour.dayOfWeek}`}
                        className="block text-sm font-medium text-muted-foreground mb-1"
                      >
                        {t("workingHours.priceAdjustment.type")}
                      </label>
                      <Select
                        value={hour.priceAdjustment?.type || "fixed"}
                        onValueChange={(value) =>
                          handlePriceAdjustmentChange(hour.dayOfWeek, "type", value as "fixed" | "percentage" | "none")
                        }
                        dir={t("common.dir") as "ltr" | "rtl" | undefined}
                      >
                        <SelectTrigger id={`price-adj-type-${hour.dayOfWeek}`}>
                          <SelectValue placeholder={t("workingHours.priceAdjustment.selectTypePlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">{t("workingHours.priceAdjustment.types.none")}</SelectItem>
                          <SelectItem value="fixed">{t("workingHours.priceAdjustment.types.fixed")}</SelectItem>
                          <SelectItem value="percentage">
                            {t("workingHours.priceAdjustment.types.percentage")}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {hour.priceAdjustment?.type !== "none" && (
                      <>
                        <div>
                          <label
                            htmlFor={`price-adj-value-${hour.dayOfWeek}`}
                            className="block text-sm font-medium text-muted-foreground mb-1"
                          >
                            {t("workingHours.priceAdjustment.value")} (
                            {hour.priceAdjustment?.type === "percentage" ? "%" : t("common.currency")})
                          </label>
                          <Input
                            id={`price-adj-value-${hour.dayOfWeek}`}
                            type="number"
                            value={hour.priceAdjustment?.value || 0}
                            onChange={(e) => handlePriceAdjustmentChange(hour.dayOfWeek, "value", e.target.value)}
                            placeholder={t("workingHours.priceAdjustment.valuePlaceholder")}
                            min="0"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label
                            htmlFor={`price-adj-reason-${hour.dayOfWeek}`}
                            className="block text-sm font-medium text-muted-foreground mb-1"
                          >
                            {t("workingHours.priceAdjustment.reason")}
                          </label>
                          <Textarea
                            id={`price-adj-reason-${hour.dayOfWeek}`}
                            value={hour.priceAdjustment?.reason || ""}
                            onChange={(e) => handlePriceAdjustmentChange(hour.dayOfWeek, "reason", e.target.value)}
                            placeholder={t("workingHours.priceAdjustment.reasonPlaceholder")}
                            rows={2}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}
                {!hour.isActive && (
                  <p className="text-xs text-muted-foreground italic">
                    {t("workingHours.priceAdjustment.applyWhenActive")}
                  </p>
                )}
              </CollapsibleContent>
            </Collapsible>
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
