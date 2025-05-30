"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { updateWeeklyHours } from "@/actions/working-hours-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useToast } from "@/components/common/ui/use-toast"
import { Loader2, SaveIcon } from "lucide-react"

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
      ? weeklyHours.sort((a, b) => a.day - b.day) // Ensure sorted initially
      : [
          { day: 0, isActive: false, startTime: "09:00", endTime: "17:00" }, // Sunday
          { day: 1, isActive: true, startTime: "09:00", endTime: "17:00" }, // Monday
          { day: 2, isActive: true, startTime: "09:00", endTime: "17:00" }, // Tuesday
          { day: 3, isActive: true, startTime: "09:00", endTime: "17:00" }, // Wednesday
          { day: 4, isActive: true, startTime: "09:00", endTime: "17:00" }, // Thursday
          { day: 5, isActive: true, startTime: "09:00", endTime: "14:00" }, // Friday
          { day: 6, isActive: false, startTime: "09:00", endTime: "17:00" }, // Saturday
        ].sort((a, b) => a.day - b.day), // Ensure default is also sorted
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
          // Basic validation: endTime should be after startTime
          if (field === "endTime" && value <= hour.startTime) {
            // Optionally show a toast or inline error, for now just don't update if invalid
            // Or, reset startTime if endTime is set earlier
            return { ...hour, [field]: value } // Allow setting for now, rely on visual cues
          }
          if (field === "startTime" && value >= hour.endTime) {
            // Optionally show a toast or inline error
            return { ...hour, [field]: value } // Allow setting for now
          }
          return { ...hour, [field]: value }
        }
        return hour
      }),
    )
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      // Validate all times before submitting
      for (const hour of hours) {
        if (hour.isActive && hour.startTime >= hour.endTime) {
          toast({
            title: t("common.error"),
            description: t("workingHours.weekly.errorEndTimeBeforeStart", { day: t(`workingHours.days.${hour.day}`) }),
            variant: "destructive",
          })
          setIsSubmitting(false)
          return
        }
      }
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
      <CardHeader>
        <CardTitle>{t("workingHours.weekly.scheduleTitle")}</CardTitle>
        <CardDescription>{t("workingHours.weeklyDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-6">
          {hours.map((hour) => (
            <Card key={hour.day} className="p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={hour.isActive}
                    onCheckedChange={(checked) => handleToggleDay(hour.day, checked)}
                    id={`day-switch-${hour.day}`}
                    aria-label={`${t("workingHours.toggleDay")} ${t(`workingHours.days.${hour.day}`)}`}
                  />
                  <label htmlFor={`day-switch-${hour.day}`} className="text-md font-medium cursor-pointer">
                    {t(`workingHours.days.${hour.day}`)}
                  </label>
                </div>

                <div
                  className={`flex flex-col sm:flex-row items-center gap-3 sm:gap-4 transition-opacity duration-300 ${hour.isActive ? "opacity-100" : "opacity-50 pointer-events-none"}`}
                >
                  <Select
                    value={hour.startTime}
                    onValueChange={(value) => handleTimeChange(hour.day, "startTime", value)}
                    disabled={!hour.isActive}
                  >
                    <SelectTrigger className="w-full sm:w-36">
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

                  <span className="text-sm text-muted-foreground self-center">-</span>

                  <Select
                    value={hour.endTime}
                    onValueChange={(value) => handleTimeChange(hour.day, "endTime", value)}
                    disabled={!hour.isActive}
                  >
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder={t("workingHours.selectTime")} />
                    </SelectTrigger>
                    <SelectContent>
                      {timeOptions
                        .filter((time) => time > hour.startTime) // Basic filtering
                        .map((time) => (
                          <SelectItem key={`end-${hour.day}-${time}`} value={time}>
                            {time}
                          </SelectItem>
                        ))}
                      {/* Show all options if startTime is not set or to allow correction */}
                      {timeOptions.filter((time) => time <= hour.startTime).length > 0 &&
                        hour.startTime &&
                        timeOptions.filter((time) => time > hour.startTime).length === 0 &&
                        timeOptions.map((time) => (
                          <SelectItem
                            key={`end-all-${hour.day}-${time}`}
                            value={time}
                            className="text-muted-foreground"
                          >
                            {time}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {hour.isActive && hour.startTime >= hour.endTime && (
                <p className="text-xs text-red-500 mt-2 text-right">{t("workingHours.weekly.warningEndTime")}</p>
              )}
            </Card>
          ))}
        </div>

        <div className="flex justify-end mt-8">
          <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <SaveIcon className="mr-2 h-5 w-5" />}
            {t("common.saveChanges")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function generateTimeOptions() {
  const options = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      // Changed to 15 min intervals
      const formattedHour = hour.toString().padStart(2, "0")
      const formattedMinute = minute.toString().padStart(2, "0")
      options.push(`${formattedHour}:${formattedMinute}`)
    }
  }
  return options
}
