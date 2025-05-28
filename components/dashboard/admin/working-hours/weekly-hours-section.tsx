"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/common/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Clock, Check, X } from "lucide-react"
import type { IWorkingHours } from "@/lib/db/models/working-hours"
import { toast } from "sonner"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface WeeklyHoursSectionProps {
  weeklyHours: IWorkingHours["weeklyHours"]
  onUpdate: (weeklyHours: IWorkingHours["weeklyHours"]) => Promise<void>
}

const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
const DAYS_SHORT = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]

export function WeeklyHoursSection({ weeklyHours, onUpdate }: WeeklyHoursSectionProps) {
  const [hours, setHours] = useState(weeklyHours)
  const [isLoading, setIsLoading] = useState(false)
  const [expandedDay, setExpandedDay] = useState<number | null>(null)

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

  const toggleDay = (dayIndex: number) => {
    setExpandedDay(expandedDay === dayIndex ? null : dayIndex)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Clock className="h-5 w-5" />
          שעות פעילות שבועיות
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {hours.map((dayHour) => (
            <Card
              key={dayHour.day}
              className={`border-2 transition-all ${
                dayHour.isActive ? "border-teal-500 bg-teal-50/30" : "border-gray-200 bg-gray-50/50"
              }`}
            >
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium ${
                        dayHour.isActive ? "bg-teal-500 text-white" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {DAYS_SHORT[dayHour.day]}
                    </div>
                    <span className="font-medium">{DAYS[dayHour.day]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {dayHour.isActive ? (
                      <span className="text-xs text-teal-600 flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        פעיל
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500 flex items-center">
                        <X className="h-3 w-3 mr-1" />
                        לא פעיל
                      </span>
                    )}
                    <Switch
                      checked={dayHour.isActive}
                      onCheckedChange={(checked) => handleDayToggle(dayHour.day, checked)}
                    />
                  </div>
                </div>

                {dayHour.isActive && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>שעות:</span>
                    </div>
                    <div className="font-medium">
                      {dayHour.startTime} - {dayHour.endTime}
                    </div>
                  </div>
                )}

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="details" className="border-0">
                    <AccordionTrigger className="py-1 text-xs">
                      {dayHour.isActive ? "הגדרות מתקדמות" : "הפעל יום זה"}
                    </AccordionTrigger>
                    <AccordionContent>
                      {dayHour.isActive && (
                        <>
                          <div className="grid grid-cols-2 gap-2 mb-3">
                            <div>
                              <Label className="text-xs">התחלה</Label>
                              <Input
                                type="time"
                                value={dayHour.startTime}
                                onChange={(e) => handleTimeChange(dayHour.day, "startTime", e.target.value)}
                                className="text-center h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">סיום</Label>
                              <Input
                                type="time"
                                value={dayHour.endTime}
                                onChange={(e) => handleTimeChange(dayHour.day, "endTime", e.target.value)}
                                className="text-center h-8 text-sm"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-xs">תוספת מחיר</Label>
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
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="בחר סוג תוספת" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">ללא תוספת</SelectItem>
                                <SelectItem value="percentage">אחוז תוספת</SelectItem>
                                <SelectItem value="fixed">סכום קבוע</SelectItem>
                              </SelectContent>
                            </Select>

                            {dayHour.priceAdjustment && (
                              <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                  <Label className="text-xs">
                                    {dayHour.priceAdjustment.type === "percentage" ? "אחוז (%)" : "סכום (₪)"}
                                  </Label>
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
                                    className="text-center h-8 text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">סיבה</Label>
                                  <Input
                                    value={dayHour.priceAdjustment.reason || ""}
                                    onChange={(e) =>
                                      handlePriceAdjustmentChange(dayHour.day, {
                                        ...dayHour.priceAdjustment,
                                        reason: e.target.value,
                                      })
                                    }
                                    placeholder="סיבה"
                                    className="h-8 text-sm"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </Card>
          ))}
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white font-medium"
        >
          {isLoading ? "שומר..." : "שמור שעות פעילות"}
        </Button>
      </CardContent>
    </Card>
  )
}
