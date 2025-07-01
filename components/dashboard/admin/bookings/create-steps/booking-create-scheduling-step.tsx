"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, Clock, ArrowLeft, User } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

interface BookingCreateSchedulingStepProps {
  formData: any
  onUpdate: (data: any) => void
  workingHours: any
  onNext: () => void
  onPrev: () => void
}

export default function BookingCreateSchedulingStep({
  formData,
  onUpdate,
  workingHours,
  onNext,
  onPrev,
}: BookingCreateSchedulingStepProps) {
  const { t, dir } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.bookingDateTime) {
      newErrors.bookingDateTime = "יש לבחור תאריך ושעה"
    }

    if (formData.isFlexibleTime && !formData.flexibilityRangeHours) {
      newErrors.flexibilityRangeHours = "יש לבחור טווח גמישות"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep()) {
      onNext()
    }
  }

  const timeSlots = [
    "08:00",
    "08:30",
    "09:00",
    "09:30",
    "10:00",
    "10:30",
    "11:00",
    "11:30",
    "12:00",
    "12:30",
    "13:00",
    "13:30",
    "14:00",
    "14:30",
    "15:00",
    "15:30",
    "16:00",
    "16:30",
    "17:00",
    "17:30",
    "18:00",
    "18:30",
    "19:00",
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
  ]

  const flexibilityRanges = [
    { value: "1", label: "1 שעה" },
    { value: "2", label: "2 שעות" },
    { value: "3", label: "3 שעות" },
    { value: "4", label: "4 שעות" },
    { value: "6", label: "6 שעות" },
  ]

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            תזמון הטיפול
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>תאריך הטיפול *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.bookingDateTime && "text-muted-foreground",
                    errors.bookingDateTime && "border-red-500"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.bookingDateTime ? format(formData.bookingDateTime, "PPP") : "בחר תאריך"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.bookingDateTime}
                  onSelect={date => {
                    if (date && date instanceof Date) {
                      const newDate = new Date(date)
                      if (formData.bookingDateTime) {
                        newDate.setHours(formData.bookingDateTime.getHours())
                        newDate.setMinutes(formData.bookingDateTime.getMinutes())
                      }
                      onUpdate({ bookingDateTime: newDate })
                    }
                  }}
                  disabled={date => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.bookingDateTime && (
              <p className="text-sm text-red-500">{errors.bookingDateTime}</p>
            )}
          </div>

          {/* Time Selection */}
          <div className="space-y-2">
            <Label htmlFor="time">שעת הטיפול *</Label>
            <Select
              value={formData.bookingDateTime ? format(formData.bookingDateTime, "HH:mm") : ""}
              onValueChange={timeString => {
                const [hours, minutes] = timeString.split(":").map(Number)
                const newDate = formData.bookingDateTime
                  ? new Date(formData.bookingDateTime)
                  : new Date()
                newDate.setHours(hours, minutes, 0, 0)
                onUpdate({ bookingDateTime: newDate })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר שעה..." />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map(time => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Flexible Time Option */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="flexibleTime"
                checked={formData.isFlexibleTime}
                onCheckedChange={checked => onUpdate({ isFlexibleTime: checked })}
              />
              <Label htmlFor="flexibleTime">גמישות בזמן הטיפול</Label>
            </div>

            {formData.isFlexibleTime && (
              <div className="space-y-2 pr-6">
                <Label htmlFor="flexibilityRange">טווח גמישות *</Label>
                <Select
                  value={formData.flexibilityRangeHours?.toString?.() || '' || ""}
                  onValueChange={value => onUpdate({ flexibilityRangeHours: parseInt(value) })}
                >
                  <SelectTrigger className={errors.flexibilityRangeHours ? "border-red-500" : ""}>
                    <SelectValue placeholder="בחר טווח..." />
                  </SelectTrigger>
                  <SelectContent>
                    {flexibilityRanges.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.flexibilityRangeHours && (
                  <p className="text-sm text-red-500">{errors.flexibilityRangeHours}</p>
                )}
                <p className="text-sm text-gray-600">
                  המטפל יכול להגיע {formData.flexibilityRangeHours} שעות לפני או אחרי השעה שנבחרה
                </p>
              </div>
            )}
          </div>

          {/* Therapist Gender Preference */}
          <div className="space-y-2">
            <Label>העדפת מגדר מטפל</Label>
            <Select
              value={formData.therapistGenderPreference}
              onValueChange={value => onUpdate({ therapistGenderPreference: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="בחר העדפה..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">ללא העדפה</SelectItem>
                <SelectItem value="male">מטפל זכר</SelectItem>
                <SelectItem value="female">מטפלת נקבה</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scheduling Summary */}
          {formData.bookingDateTime && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  סיכום תזמון
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>תאריך:</span>
                  <span className="font-medium">{format(formData.bookingDateTime, "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span>שעה:</span>
                  <span className="font-medium">{format(formData.bookingDateTime, "HH:mm")}</span>
                </div>
                {formData.isFlexibleTime && (
                  <div className="flex justify-between">
                    <span>גמישות:</span>
                    <span className="font-medium">±{formData.flexibilityRangeHours} שעות</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>העדפת מטפל:</span>
                  <span className="font-medium">
                    {formData.therapistGenderPreference === "any" && "ללא העדפה"}
                    {formData.therapistGenderPreference === "male" && "מטפל זכר"}
                    {formData.therapistGenderPreference === "female" && "מטפלת נקבה"}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Working Hours Info */}
          <Card className="bg-gray-50">
            <CardContent className="pt-6">
              <h4 className="font-medium mb-2">שעות פעילות:</h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>ימי חול:</span>
                  <span>08:00 - 22:00</span>
                </div>
                <div className="flex justify-between">
                  <span>סוף שבוע:</span>
                  <span>09:00 - 21:00</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                * עלות נוספת של 50 ש"ח עבור טיפולים אחרי 20:00 ובסופי שבוע
              </p>
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          חזור
        </Button>
        <Button onClick={handleNext}>המשך</Button>
      </div>
    </div>
  )
}
