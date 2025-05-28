"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Clock } from "lucide-react"
import type { IWorkingHours } from "@/lib/db/models/working-hours"
import { toast } from "sonner"

interface WeeklyHoursSectionProps {
  weeklyHours: IWorkingHours["weeklyHours"]
  onUpdate: (weeklyHours: IWorkingHours["weeklyHours"]) => Promise<void>
}

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]

export function WeeklyHoursSection({ weeklyHours, onUpdate }: WeeklyHoursSectionProps) {
  const [hours, setHours] = useState(weeklyHours)
  const [isLoading, setIsLoading] = useState(false)

  const handleDayToggle = (dayIndex: number, isActive: boolean) => {
    const updatedHours = hours.map((hour) => (hour.day === dayIndex ? { ...hour, isActive } : hour))
    setHours(updatedHours)
  }

  const handleTimeChange = (dayIndex: number, field: "startTime" | "endTime", value: string) => {
    const updatedHours = hours.map((hour) => (hour.day === dayIndex ? { ...hour, [field]: value } : hour))
    setHours(updatedHours)
  }

  const handlePriceAdjustmentChange = (dayIndex: number, adjustment: any) => {
    const updatedHours = hours.map((hour) => (hour.day === dayIndex ? { ...hour, priceAdjustment: adjustment } : hour))
    setHours(updatedHours)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onUpdate(hours)
      toast.success("שעות הפעילות עודכנו בהצלחה")
    } catch (error) {
      toast.error("שגיאה בעדכון שעות הפעילות")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          שעות פעילות שבועיות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {hours.map((dayHour) => (
          <div key={dayHour.day} className="space-y-4 p-4 border rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Switch
                  checked={dayHour.isActive}
                  onCheckedChange={(checked) => handleDayToggle(dayHour.day, checked)}
                />
                <Label className="text-lg font-medium">{DAYS[dayHour.day]}</Label>
              </div>
              {!dayHour.isActive && <span className="text-sm text-muted-foreground">לא פעיל</span>}
            </div>

            {dayHour.isActive && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>שעת התחלה</Label>
                    <Input
                      type="time"
                      value={dayHour.startTime}
                      onChange={(e) => handleTimeChange(dayHour.day, "startTime", e.target.value)}
                      className="text-center"
                    />
                  </div>
                  <div>
                    <Label>שעת סיום</Label>
                    <Input
                      type="time"
                      value={dayHour.endTime}
                      onChange={(e) => handleTimeChange(dayHour.day, "endTime", e.target.value)}
                      className="text-center"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label>תוספת מחיר</Label>
                  <Select
                    value={dayHour.priceAdjustment?.type || "none"}
                    onValueChange={(value) => {
                      if (value === "none") {
                        handlePriceAdjustmentChange(dayHour.day, undefined)
                      } else {
                        handlePriceAdjustmentChange(dayHour.day, {
                          type: value as "percentage" | "fixed",
                          value: 0,
                          reason: "",
                        })
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="בחר סוג תוספת" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">ללא תוספת</SelectItem>
                      <SelectItem value="percentage">אחוז תוספת</SelectItem>
                      <SelectItem value="fixed">סכום קבוע</SelectItem>
                    </SelectContent>
                  </Select>

                  {dayHour.priceAdjustment && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>{dayHour.priceAdjustment.type === "percentage" ? "אחוז (%)" : "סכום (₪)"}</Label>
                        <Input
                          type="number"
                          min="0"
                          value={dayHour.priceAdjustment.value}
                          onChange={(e) =>
                            handlePriceAdjustmentChange(dayHour.day, {
                              ...dayHour.priceAdjustment,
                              value: Number(e.target.value),
                            })
                          }
                          className="text-center"
                        />
                      </div>
                      <div>
                        <Label>סיבה (אופציונלי)</Label>
                        <Input
                          value={dayHour.priceAdjustment.reason || ""}
                          onChange={(e) =>
                            handlePriceAdjustmentChange(dayHour.day, {
                              ...dayHour.priceAdjustment,
                              reason: e.target.value,
                            })
                          }
                          placeholder="למשל: שעות ערב"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        <Button onClick={handleSave} disabled={isLoading} className="w-full">
          {isLoading ? "שומר..." : "שמור שעות פעילות"}
        </Button>
      </CardContent>
    </Card>
  )
}
