"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslation } from "@/lib/translations/i18n"

export type CalendarProps = {
  mode?: "single" | "multiple" | "range"
  selected?: Date | Date[] | { from: Date; to?: Date }
  onSelect?: (date: Date | Date[] | { from: Date; to?: Date } | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
  initialFocus?: boolean
  defaultMonth?: Date
  fromYear?: number
  toYear?: number
  captionLayout?: "dropdown" | "dropdown-buttons"
  showOutsideDays?: boolean
}

const MONTHS_IN_YEAR = 12
const DAYS_IN_WEEK = 7

function Calendar({
  className,
  mode = "single",
  selected,
  onSelect,
  disabled,
  initialFocus,
  defaultMonth,
  fromYear = 1900,
  toYear = new Date().getFullYear() + 10,
  captionLayout = "dropdown-buttons",
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const { t, language } = useTranslation()
  const isRTL = language === "he"

  const [currentMonth, setCurrentMonth] = React.useState(defaultMonth || new Date())
  const [currentYear, setCurrentYear] = React.useState(
    defaultMonth?.getFullYear() || new Date().getFullYear()
  )

  // Generate years array
  const years = React.useMemo(() => {
    const yearsList = []
    for (let year = fromYear; year <= toYear; year++) {
      yearsList.push(year)
    }
    return yearsList
  }, [fromYear, toYear])

  // Month names
  const monthNames = React.useMemo(
    () => [
      t("register.january"),
      t("register.february"),
      t("register.march"),
      t("register.april"),
      t("register.may"),
      t("register.june"),
      t("register.july"),
      t("register.august"),
      t("register.september"),
      t("register.october"),
      t("register.november"),
      t("register.december"),
    ],
    [t]
  )

  // Day names (starting from Sunday)
  const dayNames = React.useMemo(() => {
    const days = ["ראש", "שני", "שלי", "רבי", "חמי", "שיש", "שבת"]
    const englishDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    return isRTL ? days : englishDays
  }, [isRTL])

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth.getMonth(), 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth.getMonth() + 1, 0)
  const firstDayWeekday = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()

  // Get previous month's last days
  const prevMonth = new Date(currentYear, currentMonth.getMonth() - 1, 0)
  const daysInPrevMonth = prevMonth.getDate()

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    const days = []

    // Previous month days
    const prevMonthDays = firstDayWeekday
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth.getMonth() - 1, daysInPrevMonth - i),
        isCurrentMonth: false,
        isPrevMonth: true,
        isNextMonth: false,
      })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: new Date(currentYear, currentMonth.getMonth(), day),
        isCurrentMonth: true,
        isPrevMonth: false,
        isNextMonth: false,
      })
    }

    // Next month days to fill the grid
    const remainingDays = 42 - days.length // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: new Date(currentYear, currentMonth.getMonth() + 1, day),
        isCurrentMonth: false,
        isPrevMonth: false,
        isNextMonth: true,
      })
    }

    return days
  }, [currentYear, currentMonth, firstDayWeekday, daysInMonth, daysInPrevMonth])

  // Navigation functions
  const goToPreviousMonth = () => {
    if (currentMonth.getMonth() === 0) {
      setCurrentMonth(new Date(currentYear - 1, 11, 1))
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(new Date(currentYear, currentMonth.getMonth() - 1, 1))
    }
  }

  const goToNextMonth = () => {
    if (currentMonth.getMonth() === 11) {
      setCurrentMonth(new Date(currentYear + 1, 0, 1))
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(new Date(currentYear, currentMonth.getMonth() + 1, 1))
    }
  }

  const handleMonthChange = (monthIndex: string) => {
    const newMonth = new Date(currentYear, Number.parseInt(monthIndex), 1)
    setCurrentMonth(newMonth)
  }

  const handleYearChange = (year: string) => {
    const newYear = Number.parseInt(year)
    setCurrentYear(newYear)
    setCurrentMonth(new Date(newYear, currentMonth.getMonth(), 1))
  }

  // Check if date is selected
  const isSelected = (date: Date) => {
    if (!selected) return false

    if (mode === "single" && selected instanceof Date) {
      return date.toDateString() === selected.toDateString()
    }

    if (mode === "multiple" && Array.isArray(selected)) {
      return selected.some(d => d.toDateString() === date.toDateString())
    }

    if (mode === "range" && selected && typeof selected === "object" && "from" in selected) {
      if (!selected.to) {
        return date.toDateString() === selected.from.toDateString()
      }
      return date >= selected.from && date <= selected.to
    }

    return false
  }

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // Handle date click
  const handleDateClick = (date: Date) => {
    if (disabled && disabled(date)) return

    if (mode === "single") {
      onSelect?.(date)
    } else if (mode === "multiple") {
      const currentSelected = (selected as Date[]) || []
      const isAlreadySelected = currentSelected.some(d => d.toDateString() === date.toDateString())

      if (isAlreadySelected) {
        onSelect?.(currentSelected.filter(d => d.toDateString() !== date.toDateString()))
      } else {
        onSelect?.([...currentSelected, date])
      }
    } else if (mode === "range") {
      const currentSelected = selected as { from: Date; to?: Date } | undefined

      if (!currentSelected || (currentSelected.from && currentSelected.to)) {
        onSelect?.({ from: date })
      } else if (currentSelected.from && !currentSelected.to) {
        if (date < currentSelected.from) {
          onSelect?.({ from: date, to: currentSelected.from })
        } else {
          onSelect?.({ from: currentSelected.from, to: date })
        }
      }
    }
  }

  return (
    <div
      className={cn("p-4 bg-background border rounded-lg shadow-sm", className)}
      dir={isRTL ? "rtl" : "ltr"}
    >
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="outline"
          size="icon"
          onClick={isRTL ? goToNextMonth : goToPreviousMonth}
          className="h-8 w-8 hover:bg-muted transition-colors"
        >
          {isRTL ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        <div className="flex items-center gap-2">
          {captionLayout === "dropdown-buttons" ? (
            <>
              {/* Month Selector */}
              <Select value={currentMonth.getMonth().toString()} onValueChange={handleMonthChange}>
                <SelectTrigger className="w-auto min-w-[120px] h-8 text-sm font-medium">
                  <SelectValue />
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Year Selector */}
              <Select value={currentYear.toString()} onValueChange={handleYearChange}>
                <SelectTrigger className="w-auto min-w-[80px] h-8 text-sm font-medium">
                  <SelectValue />
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map(year => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          ) : (
            <div className="text-sm font-medium">
              {monthNames[currentMonth.getMonth()]} {currentYear}
            </div>
          )}
        </div>

        <Button
          variant="outline"
          size="icon"
          onClick={isRTL ? goToPreviousMonth : goToNextMonth}
          className="h-8 w-8 hover:bg-muted transition-colors"
        >
          {isRTL ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day headers */}
        {dayNames.map((day, index) => (
          <div
            key={index}
            className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarDays.map((day, index) => {
          const isDisabled = disabled && disabled(day.date)
          const isSelectedDay = isSelected(day.date)
          const isTodayDay = isToday(day.date)

          return (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 w-8 p-0 font-normal text-sm transition-all duration-200",
                "hover:bg-muted hover:scale-105",
                !day.isCurrentMonth && showOutsideDays && "text-muted-foreground opacity-50",
                !day.isCurrentMonth && !showOutsideDays && "invisible",
                isSelectedDay &&
                  "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground shadow-md",
                isTodayDay &&
                  !isSelectedDay &&
                  "bg-accent text-accent-foreground font-semibold ring-1 ring-primary/20",
                isDisabled &&
                  "text-muted-foreground opacity-30 cursor-not-allowed hover:bg-transparent hover:scale-100"
              )}
              onClick={() => handleDateClick(day.date)}
              disabled={isDisabled}
            >
              {day.date.getDate()}
            </Button>
          )
        })}
      </div>

      {/* Quick navigation for birthdays */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2 text-center">
          {t("common.quickNavigation")}
        </div>
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const today = new Date()
              setCurrentYear(today.getFullYear())
              setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))
            }}
            className="text-xs h-7"
          >
            {t("common.today")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const birthYear = new Date().getFullYear() - 25 // Default to 25 years ago
              setCurrentYear(birthYear)
              setCurrentMonth(new Date(birthYear, 0, 1))
            }}
            className="text-xs h-7"
          >
            {t("common.birthYear")}
          </Button>
        </div>
      </div>
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
