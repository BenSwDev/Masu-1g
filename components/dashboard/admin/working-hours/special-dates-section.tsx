"use client"

import { useState, useMemo } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { deleteSpecialDate, toggleSpecialDateActiveStatus } from "@/actions/working-hours-actions"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
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
import { PlusIcon, EditIcon, TrashIcon, PowerIcon, MoreHorizontalIcon, CalendarDaysIcon } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
import { DataTable } from "@/components/common/ui/data-table" // Assuming you have a generic DataTable
import type { ColumnDef } from "@tanstack/react-table"
import { format } from "date-fns"
import { he } from "date-fns/locale" // For Hebrew date formatting
import { ru } from "date-fns/locale" // For Russian date formatting
import type { ClientWorkingHours } from "@/lib/db/models/working-hours"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"

type SpecialDateClient = ClientWorkingHours["specialDates"][0]
type WeeklyHourItemClient = ClientWorkingHours["weeklyHours"][0]

interface SpecialDatesSectionProps {
  specialDates: SpecialDateClient[]
  weeklyHours: WeeklyHourItemClient[]
  onRefresh: () => void
}

export function SpecialDatesSection({ specialDates, weeklyHours, onRefresh }: SpecialDatesSectionProps) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDate, setEditingDate] = useState<SpecialDateClient | undefined>(undefined)
  const [dateToDelete, setDateToDelete] = useState<string | null>(null)
  const [isLoadingAction, setIsLoadingAction] = useState(false)
  const [monthFilter, setMonthFilter] = useState<string>("all")

  const getDateLocale = () => {
    switch (i18n.language) {
      case "he":
        return he
      case "ru":
        return ru
      default:
        return undefined // For English or other languages date-fns handles by default
    }
  }

  const formatDateDisplay = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, "PPP", { locale: getDateLocale() })
    } catch (e) {
      return dateString // fallback
    }
  }

  const formatTime = (timeString?: string) => {
    if (!timeString || !timeString.includes(":")) return ""
    return timeString // Already HH:mm
  }

  const handleFormSuccess = () => {
    onRefresh()
    setIsFormOpen(false)
    setEditingDate(undefined)
    // Toast is handled within the form itself
  }

  const handleToggleStatus = async (id: string, currentIsActive: boolean) => {
    setIsLoadingAction(true)
    try {
      const result = await toggleSpecialDateActiveStatus(id)
      if (result.success) {
        onRefresh()
        toast({
          title: t("common.success"),
          description: t(
            currentIsActive ? "workingHours.specialDate.deactivateSuccess" : "workingHours.specialDate.activateSuccess",
          ),
          variant: "success",
        })
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("workingHours.specialDate.statusUpdateError"),
        variant: "destructive",
      })
    } finally {
      setIsLoadingAction(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!dateToDelete) return
    setIsLoadingAction(true)
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
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: error instanceof Error ? error.message : t("workingHours.specialDate.deleteError"),
        variant: "destructive",
      })
    } finally {
      setIsLoadingAction(false)
      setDateToDelete(null)
    }
  }

  const getHoursDisplay = (specialDate: SpecialDateClient): string => {
    if (specialDate.isClosed) {
      return t("workingHours.weekly.closed")
    }
    if (specialDate.startTime && specialDate.endTime) {
      return `${formatTime(specialDate.startTime)} - ${formatTime(specialDate.endTime)}`
    }
    // Try to get default from weekly hours
    const dayOfWeek = new Date(specialDate.date).getDay()
    const weeklyDay = weeklyHours.find((wh) => wh.day === dayOfWeek)
    if (weeklyDay?.isActive && weeklyDay.startTime && weeklyDay.endTime) {
      return `${formatTime(weeklyDay.startTime)} - ${formatTime(weeklyDay.endTime)} (${t("workingHours.specialDate.usesWeeklyDefaultShort")})`
    }
    return t("common.notSet")
  }

  const getPriceAdjustmentDisplay = (specialDate: SpecialDateClient): string => {
    if (!specialDate.isActive || !specialDate.priceAdjustment) {
      return t("workingHours.priceAdjustment.noAdjustment")
    }
    const { type, value } = specialDate.priceAdjustment
    const symbol = type === "percentage" ? "%" : ` ${t("common.currency")}`
    return `${t(`workingHours.priceAdjustment.types.${type}`)}: ${value}${symbol}`
  }

  const columns: ColumnDef<SpecialDateClient>[] = useMemo(
    () => [
      {
        accessorKey: "date",
        header: t("workingHours.specialDate.dateColumn"),
        cell: ({ row }) => formatDateDisplay(row.original.date),
      },
      { accessorKey: "name", header: t("workingHours.specialDate.nameColumn") },
      {
        accessorKey: "isActive",
        header: t("workingHours.specialDate.statusColumn"),
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "outline"}>
            {row.original.isActive ? t("common.active") : t("common.inactive")}
          </Badge>
        ),
      },
      {
        accessorKey: "hours",
        header: t("workingHours.specialDate.hoursColumn"),
        cell: ({ row }) => getHoursDisplay(row.original),
      },
      {
        accessorKey: "priceAdjustment",
        header: t("workingHours.specialDate.priceAdjColumn"),
        cell: ({ row }) => getPriceAdjustmentDisplay(row.original),
      },
      {
        id: "actions",
        header: () => <div className="text-right">{t("common.actions")}</div>,
        cell: ({ row }) => (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" disabled={isLoadingAction}>
                  <MoreHorizontalIcon className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingDate(row.original)
                    setIsFormOpen(true)
                  }}
                  disabled={isLoadingAction}
                >
                  <EditIcon className="mr-2 h-4 w-4" />
                  {t("common.edit")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleToggleStatus(row.original._id!, row.original.isActive)}
                  disabled={isLoadingAction}
                >
                  <PowerIcon className="mr-2 h-4 w-4" />
                  {row.original.isActive ? t("common.deactivate") : t("common.activate")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDateToDelete(row.original._id!)}
                  className="text-red-600 focus:text-red-600"
                  disabled={isLoadingAction}
                >
                  <TrashIcon className="mr-2 h-4 w-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
      },
    ],
    [t, isLoadingAction, weeklyHours, i18n.language],
  ) // Add weeklyHours and language to dependencies

  const monthOptions = useMemo(() => {
    const months = new Set<string>()
    specialDates.forEach((sd) => {
      const monthYear = format(new Date(sd.date), "yyyy-MM")
      months.add(monthYear)
    })
    return Array.from(months)
      .sort()
      .map((my) => ({
        value: my,
        label: format(new Date(my + "-01"), "MMMM yyyy", { locale: getDateLocale() }),
      }))
  }, [specialDates, i18n.language])

  const filteredSpecialDates = useMemo(() => {
    if (monthFilter === "all") return specialDates
    return specialDates.filter((sd) => format(new Date(sd.date), "yyyy-MM") === monthFilter)
  }, [specialDates, monthFilter])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t("workingHours.specialDate.filterByMonth")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("workingHours.specialDate.allMonths")}</SelectItem>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setEditingDate(undefined)
            setIsFormOpen(true)
          }}
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          {t("workingHours.specialDate.addNew")}
        </Button>
      </div>

      {filteredSpecialDates.length > 0 ? (
        <DataTable columns={columns} data={filteredSpecialDates} />
      ) : (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-10 text-center">
          <CalendarDaysIcon className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">{t("workingHours.specialDate.noSpecialDatesHeader")}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {monthFilter === "all"
              ? t("workingHours.specialDate.noSpecialDatesYet")
              : t("workingHours.specialDate.noSpecialDatesForMonth")}
          </p>
        </div>
      )}

      <SpecialDateForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        specialDate={editingDate}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!dateToDelete} onOpenChange={(open) => !open && setDateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("workingHours.specialDate.deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("workingHours.specialDate.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoadingAction}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isLoadingAction}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoadingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
