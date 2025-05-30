"use client"
import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { deleteSpecialDate, toggleSpecialDateStatus } from "@/actions/working-hours-actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { Calendar } from "@/components/common/ui/calendar"
import { SpecialDateForm } from "./special-date-form"
import { useToast } from "@/components/common/ui/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/common/ui/alert-dialog"
import {
  PlusIcon,
  ClockIcon,
  Edit,
  Trash,
  Power,
  TagIcon,
  PercentIcon,
  Info,
  ChevronDownIcon as LucideChevronDownIcon,
} from "lucide-react" // Using Lucide's ChevronDown
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import type { ClientSpecialDateConfig, ClientWeeklyHourConfig } from "./types"
import { Loader2 } from "lucide-react"

/**
 * @interface SpecialDatesSectionProps
 * @description Props for the SpecialDatesSection component.
 * @property {ClientSpecialDateConfig[]} specialDates - Array of current special date configurations.
 * @property {ClientWeeklyHourConfig[]} weeklyHours - Array of weekly hours, used to determine default times if special date times are not set.
 * @property {() => void} onRefresh - Callback function to refresh working hours data.
 */
interface SpecialDatesSectionProps {
  specialDates: ClientSpecialDateConfig[]
  weeklyHours: ClientWeeklyHourConfig[]
  onRefresh: () => void
}

/**
 * @component SpecialDatesSection
 * @description Component for managing special dates (holidays, events).
 * Allows viewing dates on a calendar, adding, editing, deleting, and toggling status of special dates.
 */
export function SpecialDatesSection({ specialDates, weeklyHours, onRefresh }: SpecialDatesSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isAddingDate, setIsAddingDate] = useState(false)
  const [editingDate, setEditingDate] = useState<ClientSpecialDateConfig | null>(null)
  const [dateToDelete, setDateToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false) // General loading state for actions
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)

  const handleAddSuccess = () => {
    setIsAddingDate(false)
    onRefresh()
    // Toast is now shown from the form on successful action call
  }

  const handleEditSuccess = () => {
    setEditingDate(null)
    onRefresh()
    // Toast is now shown from the form
  }

  const handleCancelForm = () => {
    setIsAddingDate(false)
    setEditingDate(null)
  }

  const handleToggleStatus = async (id: string, currentIsActive: boolean) => {
    setIsLoading(true)
    try {
      const result = await toggleSpecialDateStatus(id)
      if (result.success) {
        onRefresh()
        toast({
          title: t("common.success"),
          description: currentIsActive
            ? t("workingHours.specialDate.deactivateSuccess")
            : t("workingHours.specialDate.activateSuccess"),
          variant: "success",
        })
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("workingHours.specialDate.statusUpdateError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("workingHours.specialDate.statusUpdateError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!dateToDelete) return
    setIsLoading(true)
    try {
      const result = await deleteSpecialDate(dateToDelete)
      if (result.success) {
        onRefresh()
        toast({
          title: t("common.success"),
          description: t("workingHours.specialDate.deleteSuccess"),
          variant: "success",
        })
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("workingHours.specialDate.deleteError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("workingHours.specialDate.deleteError"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setDateToDelete(null)
    }
  }

  const formatDateDisplay = (dateString: string): string => {
    const date = new Date(dateString) // dateString is ISO string
    return new Intl.DateTimeFormat((t("common.locale") as string) || "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  const formatTime = (timeString?: string): string => {
    if (!timeString || !timeString.includes(":")) return t("common.notSet")
    const [hours, minutes] = timeString.split(":")
    return `${hours}:${minutes}`
  }

  const filteredDates = selectedDate
    ? specialDates.filter((sd) => {
        const specialDateObj = new Date(sd.date) // sd.date is ISO string
        return (
          specialDateObj.getUTCDate() === selectedDate.getUTCDate() &&
          specialDateObj.getUTCMonth() === selectedDate.getUTCMonth() &&
          specialDateObj.getUTCFullYear() === selectedDate.getUTCFullYear()
        )
      })
    : specialDates

  const specialDatesForCalendar = specialDates.map((sd) => new Date(sd.date)) // Convert ISO strings to Date objects

  if (isAddingDate || editingDate) {
    return (
      <SpecialDateForm
        specialDate={editingDate || undefined} // Pass undefined if adding
        onSuccess={editingDate ? handleEditSuccess : handleAddSuccess}
        onCancel={handleCancelForm}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <CardTitle>{t("workingHours.specialDates")}</CardTitle>
        <Button onClick={() => setIsAddingDate(true)} disabled={isLoading}>
          <PlusIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t("workingHours.specialDate.addNew")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("workingHours.specialDate.sectionDescription")}</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("workingHours.specialDate.calendarTitle")}</CardTitle>
            <CardDescription>{t("workingHours.specialDate.calendarDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              dir={t("common.dir") as "ltr" | "rtl" | undefined}
              modifiers={{
                special: specialDatesForCalendar,
              }}
              modifiersStyles={{
                special: {
                  fontWeight: "bold",
                  backgroundColor: "hsl(var(--primary) / 0.1)",
                  color: "hsl(var(--primary))",
                  borderRadius: "var(--radius)",
                },
              }}
            />
          </CardContent>
          {selectedDate && (
            <CardFooter>
              <Button variant="outline" onClick={() => setSelectedDate(undefined)} className="w-full">
                {t("workingHours.specialDate.clearSelection")}
              </Button>
            </CardFooter>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-lg font-medium">
            {selectedDate
              ? `${t("workingHours.specialDate.eventsFor")}: ${formatDateDisplay(selectedDate.toISOString())}`
              : t("workingHours.specialDate.allEvents")}
          </h3>

          {filteredDates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {selectedDate
                    ? t("workingHours.specialDate.noEventsForSelection")
                    : t("workingHours.specialDate.noEventsInList")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredDates.map((specialDateItem) => {
                const dayOfWeek = new Date(specialDateItem.date).getDay() // specialDateItem.date is ISO string
                const weeklyDaySetting = weeklyHours.find((wh) => wh.day === dayOfWeek)

                const displayStartTime =
                  specialDateItem.startTime ||
                  (weeklyDaySetting && weeklyDaySetting.isActive ? weeklyDaySetting.startTime : undefined)
                const displayEndTime =
                  specialDateItem.endTime ||
                  (weeklyDaySetting && weeklyDaySetting.isActive ? weeklyDaySetting.endTime : undefined)

                const areHoursInherited =
                  !specialDateItem.startTime &&
                  !specialDateItem.endTime &&
                  weeklyDaySetting &&
                  weeklyDaySetting.isActive
                const isTimeNotSet = !displayStartTime && !displayEndTime

                return (
                  <Card key={specialDateItem._id} className="flex flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{specialDateItem.name}</CardTitle>
                        <Badge variant={specialDateItem.isActive ? "default" : "outline"}>
                          {specialDateItem.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </div>
                      <CardDescription>{formatDateDisplay(specialDateItem.date)}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3 space-y-2 flex-grow">
                      {specialDateItem.description && (
                        <p className="text-sm text-muted-foreground">{specialDateItem.description}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <ClockIcon className="h-4 w-4 me-2 rtl:ms-2 rtl:me-0 flex-shrink-0" />
                        <span>
                          {isTimeNotSet && !specialDateItem.isActive ? ( // If inactive and no times, show "Not Set" or "Closed"
                            t("common.inactive") // Or a specific "Closed" message
                          ) : isTimeNotSet && specialDateItem.isActive ? (
                            t("common.notSet") // Active but no specific times, implies using default or error
                          ) : (
                            <>
                              {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
                              {areHoursInherited && specialDateItem.isActive && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ms-1 rtl:mr-1 rtl:ms-0 text-muted-foreground inline-block cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>{t("workingHours.specialDate.defaultHoursIndicator")}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </>
                          )}
                        </span>
                      </div>
                      {specialDateItem.isActive &&
                        specialDateItem.priceAdjustment && ( // Only show if active and has adjustment
                          <div className="text-sm text-muted-foreground border-t pt-2 mt-2">
                            <p className="font-medium text-foreground mb-1">
                              {t("workingHours.priceAdjustment.title")}:
                            </p>
                            <div className="flex items-center">
                              {specialDateItem.priceAdjustment.type === "percentage" ? (
                                <PercentIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0 text-primary" />
                              ) : (
                                <TagIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0 text-primary" />
                              )}
                              <span>
                                {specialDateItem.priceAdjustment.value}
                                {specialDateItem.priceAdjustment.type === "percentage"
                                  ? "%"
                                  : ` ${t("common.currency")}`}
                                {` (${t(`workingHours.priceAdjustment.types.${specialDateItem.priceAdjustment.type}`)})`}
                              </span>
                            </div>
                            {specialDateItem.priceAdjustment.reason && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-start mt-1">
                                      <Info className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 flex-shrink-0 text-blue-500" />
                                      <p className="truncate italic">{specialDateItem.priceAdjustment.reason}</p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" align="start">
                                    <p className="max-w-xs">{specialDateItem.priceAdjustment.reason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse border-t pt-3 mt-auto">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" disabled={isLoading}>
                            {t("common.actions")}
                            <LucideChevronDownIcon className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingDate(specialDateItem)} disabled={isLoading}>
                            <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(specialDateItem._id, specialDateItem.isActive)}
                            disabled={isLoading}
                          >
                            <Power className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {specialDateItem.isActive ? t("common.deactivate") : t("common.activate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDateToDelete(specialDateItem._id)}
                            className="text-red-500 hover:!text-red-500 focus:!text-red-500"
                            disabled={isLoading}
                          >
                            <Trash className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("common.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!dateToDelete} onOpenChange={(open) => !open && setDateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workingHours.specialDate.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("workingHours.specialDate.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
              {isLoading ? <Loader2 className="mr-2 rtl:ml-2 h-4 w-4 animate-spin" /> : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
