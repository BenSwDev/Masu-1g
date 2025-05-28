"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { updateWeeklyHours } from "@/actions/working-hours-actions"
import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"
import { Loader2 } from 'lucide-react'

interface WeeklyHoursSectionProps {
  weeklyHours: any[]
  onRefresh: () => void
}

export function WeeklyHoursSection({ weeklyHours, onRefresh }: WeeklyHoursSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hours, setHours] = useState<any[]>(
    weeklyHours.length
      ? weeklyHours
      : [
          { day: 0, isActive: false, startTime: "09:00", endTime: "17:00" },
          { day: 1, isActive: true, startTime: "09:00", endTime: "17:00" },
          { day: 2, isActive: true, startTime: "09:00", endTime: "17:00" },
          { day: 3, isActive: true, startTime: "09:00", endTime: "17:00" },
          { day: 4, isActive: true, startTime: "09:00", endTime: "17:00" },
          { day: 5, isActive: true, startTime: "09:00", endTime: "14:00" },
          { day: 6, isActive: false, startTime: "09:00", endTime: "17:00" },
        ],
  )

  const handleToggleDay = (day: number, isActive: boolean) => {
    setHours(
      hours.map((hour) => {
        if (hour.day === day) {
          return { ...hour, isActive }
        }
        return hour
      }),
    )
  }

  const handleTimeChange = (day: number, field: "startTime" | "endTime", value: string) => {
    setHours(
      hours.map((hour) => {
        if (hour.day === day) {
          return { ...hour, [field]: value }
        }
        return hour
      }),
    )
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      await updateWeeklyHours(hours)
      toast({
        title: t("workingHours.updateSuccess"),
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

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">{t("workingHours.weeklyDescription")}</p>

          <div className="space-y-4">
            {hours
              .sort((a, b) => a.day - b.day)
              .map((hour) => (
                <div key={hour.day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-2">
                  <div className="flex items-center space-x-4">
                    <Switch
                      checked={hour.isActive}
                      onCheckedChange={(checked) => handleToggleDay(hour.day, checked)}
                      id={`day-${hour.day}`}
                    />
                    <label htmlFor={`day-${hour.day}`} className="text-sm font-medium cursor-pointer">
                      {t(`workingHours.days.${hour.day}`)}
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <Select
                      value={hour.startTime}
                      onValueChange={(value) => handleTimeChange(hour.day, "startTime", value)}
                      disabled={!hour.isActive}
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

                    <span className="hidden sm:block text-sm self-center">-</span>

                    <Select
                      value={hour.endTime}
                      onValueChange={(value) => handleTimeChange(hour.day, "endTime", value)}
                      disabled={!hour.isActive}
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
              ))}
          </div>

          <div className="flex justify-end">
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
