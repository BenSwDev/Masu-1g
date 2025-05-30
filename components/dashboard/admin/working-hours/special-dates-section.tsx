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
import { PlusIcon, ClockIcon, Edit, Trash, Power, TagIcon, PercentIcon, Info, MoreVertical } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/common/ui/tooltip"
import { Separator } from "@/components/common/ui/separator"

interface SpecialDatesSectionProps {
  specialDates: any[]
  weeklyHours: any[]
  onRefresh: () => void
}

export function SpecialDatesSection({ specialDates, weeklyHours, onRefresh }: SpecialDatesSectionProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [isAddingOrEditing, setIsAddingOrEditing] = useState<null | "add" | "edit">(null)
  const [currentDate, setCurrentDate] = useState<any>(null)
  const [dateToDelete, setDateToDelete] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>(undefined)

  const handleFormSuccess = () => {
    setIsAddingOrEditing(null)
    setCurrentDate(null)
    onRefresh()
    // Toast messages are handled within the form itself or can be generic here
  }

  const handleCancelForm = () => {
    setIsAddingOrEditing(null)
    setCurrentDate(null)
  }

  const handleToggleStatus = async (id: string, currentIsActive: boolean) => {
    try {
      setIsLoading(true)
      await toggleSpecialDateStatus(id)
      onRefresh()
      toast({
        title: t("common.success"),
        description: currentIsActive
          ? t("workingHours.specialDate.deactivateSuccess")
          : t("workingHours.specialDate.activateSuccess"),
        variant: "success",
      })
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
    try {
      setIsLoading(true)
      await deleteSpecialDate(dateToDelete)
      onRefresh()
      toast({
        title: t("common.success"),
        description: t("workingHours.specialDate.deleteSuccess"),
        variant: "success",
      })
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

  const formatDateDisplay = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat((t("common.locale") as string) || "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date)
  }

  const formatTime = (timeString: string | undefined | null) => {
    if (!timeString || !timeString.includes(":")) return t("common.notSet")
    const [hours, minutes] = timeString.split(":")
    return `${hours}:${minutes}`
  }

  const filteredDates = selectedCalendarDate
    ? specialDates.filter((date) => {
        const specialDateObj = new Date(date.date)
        return (
          specialDateObj.getDate() === selectedCalendarDate.getDate() &&
          specialDateObj.getMonth() === selectedCalendarDate.getMonth() &&
          specialDateObj.getFullYear() === selectedCalendarDate.getFullYear()
        )
      })
    : specialDates.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  const specialDatesForCalendar = specialDates.map((date) => new Date(date.date))

  if (isAddingOrEditing) {
    return (
      <SpecialDateForm
        specialDate={isAddingOrEditing === "edit" ? currentDate : null}
        onSuccess={handleFormSuccess}
        onCancel={handleCancelForm}
      />
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("workingHours.specialDates")}</h2>
          <p className="text-sm text-muted-foreground">{t("workingHours.specialDate.sectionDescription")}</p>
        </div>
        <Button
          onClick={() => {
            setIsAddingOrEditing("add")
            setCurrentDate(null)
          }}
        >
          <PlusIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
          {t("workingHours.specialDate.addNew")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>{t("workingHours.specialDate.calendarTitle")}</CardTitle>
            <CardDescription>{t("workingHours.specialDate.calendarDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedCalendarDate}
              onSelect={setSelectedCalendarDate}
              className="rounded-md border shadow-sm"
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
              dir={t("common.dir") as "ltr" | "rtl" | undefined}
            />
          </CardContent>
          {selectedCalendarDate && (
            <CardFooter>
              <Button variant="outline" onClick={() => setSelectedCalendarDate(undefined)} className="w-full">
                {t("workingHours.specialDate.clearSelection")}
              </Button>
            </CardFooter>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-semibold">
            {selectedCalendarDate
              ? `${t("workingHours.specialDate.eventsFor")}: ${formatDateDisplay(selectedCalendarDate.toISOString())}`
              : t("workingHours.specialDate.allEvents")}
          </h3>

          {filteredDates.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {selectedCalendarDate
                    ? t("workingHours.specialDate.noEventsForSelection")
                    : t("workingHours.specialDate.noEventsInList")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredDates.map((specialDate) => {
                const dayOfWeek = new Date(specialDate.date).getDay()
                const weeklyDaySetting = weeklyHours.find((wh) => wh.day === dayOfWeek)

                const displayStartTime =
                  specialDate.startTime ||
                  (weeklyDaySetting && weeklyDaySetting.isActive ? weeklyDaySetting.startTime : undefined)
                const displayEndTime =
                  specialDate.endTime ||
                  (weeklyDaySetting && weeklyDaySetting.isActive ? weeklyDaySetting.endTime : undefined)

                const areHoursInherited =
                  !specialDate.startTime && !specialDate.endTime && weeklyDaySetting && weeklyDaySetting.isActive
                const isTimeNotSet = !displayStartTime && !displayEndTime

                return (
                  <Card key={specialDate._id} className="shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{specialDate.name}</CardTitle>
                        <Badge variant={specialDate.isActive ? "default" : "outline"} className="text-xs">
                          {specialDate.isActive ? t("common.active") : t("common.inactive")}
                        </Badge>
                      </div>
                      <CardDescription>{formatDateDisplay(specialDate.date)}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4 space-y-3">
                      {specialDate.description && (
                        <p className="text-sm text-muted-foreground">{specialDate.description}</p>
                      )}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <ClockIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0" />
                        <span>
                          {isTimeNotSet ? (
                            t("common.notSet")
                          ) : (
                            <>
                              {formatTime(displayStartTime)} - {formatTime(displayEndTime)}
                              {areHoursInherited && specialDate.isActive && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Info className="h-3 w-3 ml-1 rtl:mr-1 rtl:ml-0 text-muted-foreground inline-block cursor-help" />
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
                      {specialDate.priceAdjustment && specialDate.isActive && (
                        <>
                          <Separator />
                          <div className="text-sm">
                            <p className="font-medium text-foreground mb-1">
                              {t("workingHours.priceAdjustment.title")}:
                            </p>
                            <div className="flex items-center text-muted-foreground">
                              {specialDate.priceAdjustment.type === "percentage" ? (
                                <PercentIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0 text-primary" />
                              ) : (
                                <TagIcon className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 flex-shrink-0 text-primary" />
                              )}
                              <span>
                                {specialDate.priceAdjustment.value}
                                {specialDate.priceAdjustment.type === "percentage" ? "%" : ` ${t("common.currency")}`}
                                {` (${t(`workingHours.priceAdjustment.types.${specialDate.priceAdjustment.type}`)})`}
                              </span>
                            </div>
                            {specialDate.priceAdjustment.reason && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-start mt-1 text-muted-foreground">
                                      <Info className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0 mt-0.5 flex-shrink-0 text-blue-500" />
                                      <p className="truncate italic text-xs">{specialDate.priceAdjustment.reason}</p>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" align="start">
                                    <p className="max-w-xs text-sm">{specialDate.priceAdjustment.reason}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-end space-x-2 rtl:space-x-reverse border-t pt-4">
                      <DropdownMenu dir={t("common.dir") as "ltr" | "rtl" | undefined}>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">{t("common.actions")}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setIsAddingOrEditing("edit")
                              setCurrentDate(specialDate)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {t("common.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(specialDate._id, specialDate.isActive)}
                            disabled={isLoading}
                          >
                            <Power className="h-4 w-4 mr-2 rtl:ml-2 rtl:mr-0" />
                            {specialDate.isActive ? t("common.deactivate") : t("common.activate")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDateToDelete(specialDate._id)}
                            className="text-red-600 hover:!text-red-600 focus:!text-red-600"
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
        <AlertDialogContent dir={t("common.dir") as "ltr" | "rtl" | undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workingHours.specialDate.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("workingHours.specialDate.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700 focus:bg-red-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2 rtl:ml-2 rtl:mr-0" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
