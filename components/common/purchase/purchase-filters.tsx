"use client"

import { useState } from "react"
import { CalendarIcon, Search, Filter, X } from "lucide-react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTranslation } from "@/lib/translations/i18n"
import type {
  PurchaseFilters,
  TransactionType,
  TransactionStatus,
} from "@/lib/types/purchase-summary"
import { cn } from "@/lib/utils"

interface PurchaseFiltersProps {
  filters: Partial<PurchaseFilters>
  onFiltersChange: (filters: Partial<PurchaseFilters>) => void
  onClearFilters: () => void
  showAdvanced?: boolean
}

export default function PurchaseFiltersComponent({
  filters,
  onFiltersChange,
  onClearFilters,
  showAdvanced = true,
}: PurchaseFiltersProps) {
  const { t, dir } = useTranslation()
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const transactionTypes: { value: TransactionType; label: string }[] = [
    { value: "booking", label: t("purchaseFilters.types.booking") || "הזמנה" },
    { value: "subscription", label: t("purchaseFilters.types.subscription") || "מנוי" },
    { value: "gift_voucher", label: t("purchaseFilters.types.giftVoucher") || "שובר מתנה" },
  ]

  const transactionStatuses: { value: TransactionStatus; label: string }[] = [
    { value: "pending", label: t("purchaseFilters.statuses.pending") || "ממתין" },
    { value: "completed", label: t("purchaseFilters.statuses.completed") || "הושלם" },
    { value: "active", label: t("purchaseFilters.statuses.active") || "פעיל" },
    { value: "cancelled", label: t("purchaseFilters.statuses.cancelled") || "בוטל" },
    { value: "expired", label: t("purchaseFilters.statuses.expired") || "פג תוקף" },
    { value: "partially_used", label: t("purchaseFilters.statuses.partiallyUsed") || "נוצל חלקית" },
    { value: "fully_used", label: t("purchaseFilters.statuses.fullyUsed") || "נוצל במלואו" },
  ]

  const handleTypeChange = (type: TransactionType, checked: boolean) => {
    const currentTypes = filters.type || []
    const newTypes = checked ? [...currentTypes, type] : currentTypes.filter(t => t !== type)

    onFiltersChange({ ...filters, type: newTypes })
  }

  const handleStatusChange = (status: TransactionStatus, checked: boolean) => {
    const currentStatuses = filters.status || []
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter(s => s !== status)

    onFiltersChange({ ...filters, status: newStatuses })
  }

  const activeFiltersCount = [
    filters.search,
    filters.type?.length,
    filters.status?.length,
    filters.dateFrom,
    filters.dateTo,
    filters.amountMin,
    filters.amountMax,
  ].filter(Boolean).length

  return (
    <Card dir={dir}>
      <CardHeader>
        <div
          className={`flex items-center justify-between ${dir === "rtl" ? "flex-row-reverse" : ""}`}
        >
          <div>
            <CardTitle
              className={`text-lg flex items-center gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
            >
              <Filter className="h-5 w-5" />
              {t("purchaseFilters.title") || "פילטרים"}
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className={dir === "rtl" ? "ml-2" : "mr-2"}>
                  {activeFiltersCount}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {t("purchaseFilters.description") || "סנן וחפש בהיסטוריית הרכישות"}
            </CardDescription>
          </div>
          <div className={`flex gap-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
            {showAdvanced && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                {showAdvancedFilters
                  ? t("purchaseFilters.hideAdvanced") || "הסתר מתקדם"
                  : t("purchaseFilters.showAdvanced") || "הצג מתקדם"}
              </Button>
            )}
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
              >
                <X className="h-4 w-4" />
                {t("purchaseFilters.clearAll") || "נקה הכל"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div
          className={`flex items-center ${dir === "rtl" ? "space-x-reverse space-x-2" : "space-x-2"}`}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              t("purchaseFilters.searchPlaceholder") || "חפש לפי תיאור, שם לקוח, אימייל או טלפון..."
            }
            value={filters.search || ""}
            onChange={e => onFiltersChange({ ...filters, search: e.target.value || undefined })}
            className="flex-1"
            dir={dir}
          />
        </div>

        {/* Quick Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Transaction Types */}
          <div>
            <Label className="text-sm font-medium">
              {t("purchaseFilters.transactionTypes") || "סוגי עסקאות"}
            </Label>
            <div className="mt-2 space-y-2">
              {transactionTypes.map(type => (
                <div
                  key={type.value}
                  className={`flex items-center ${dir === "rtl" ? "space-x-reverse space-x-2" : "space-x-2"}`}
                >
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={filters.type?.includes(type.value) || false}
                    onCheckedChange={checked => handleTypeChange(type.value, checked as boolean)}
                  />
                  <Label htmlFor={`type-${type.value}`} className="text-sm cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Transaction Status */}
          <div>
            <Label className="text-sm font-medium">
              {t("purchaseFilters.statuses") || "סטטוסים"}
            </Label>
            <div className="mt-2 space-y-2">
              {transactionStatuses.slice(0, 4).map(status => (
                <div
                  key={status.value}
                  className={`flex items-center ${dir === "rtl" ? "space-x-reverse space-x-2" : "space-x-2"}`}
                >
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filters.status?.includes(status.value) || false}
                    onCheckedChange={checked =>
                      handleStatusChange(status.value, checked as boolean)
                    }
                  />
                  <Label htmlFor={`status-${status.value}`} className="text-sm cursor-pointer">
                    {status.label}
                  </Label>
                </div>
              ))}
              {transactionStatuses.length > 4 && showAdvancedFilters && (
                <>
                  {transactionStatuses.slice(4).map(status => (
                    <div
                      key={status.value}
                      className={`flex items-center ${dir === "rtl" ? "space-x-reverse space-x-2" : "space-x-2"}`}
                    >
                      <Checkbox
                        id={`status-${status.value}`}
                        checked={filters.status?.includes(status.value) || false}
                        onCheckedChange={checked =>
                          handleStatusChange(status.value, checked as boolean)
                        }
                      />
                      <Label htmlFor={`status-${status.value}`} className="text-sm cursor-pointer">
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Date Range - From */}
          <div>
            <Label className="text-sm font-medium">
              {t("purchaseFilters.dateFrom") || "מתאריך"}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full mt-2 justify-start text-left font-normal",
                    !filters.dateFrom && "text-muted-foreground",
                    dir === "rtl" && "text-right"
                  )}
                >
                  <CalendarIcon className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                  {filters.dateFrom ? (
                    format(filters.dateFrom, "PPP", { locale: he })
                  ) : (
                    <span>{t("purchaseFilters.selectDate") || "בחר תאריך"}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateFrom}
                  onSelect={date => onFiltersChange({ ...filters, dateFrom: date })}
                  disabled={date => date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Date Range - To */}
          <div>
            <Label className="text-sm font-medium">
              {t("purchaseFilters.dateTo") || "עד תאריך"}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full mt-2 justify-start text-left font-normal",
                    !filters.dateTo && "text-muted-foreground",
                    dir === "rtl" && "text-right"
                  )}
                >
                  <CalendarIcon className={`h-4 w-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                  {filters.dateTo ? (
                    format(filters.dateTo, "PPP", { locale: he })
                  ) : (
                    <span>{t("purchaseFilters.selectDate") || "בחר תאריך"}</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={filters.dateTo}
                  onSelect={date => onFiltersChange({ ...filters, dateTo: date })}
                  disabled={date =>
                    date > new Date() || (filters.dateFrom && date < filters.dateFrom)
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && showAdvancedFilters && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="text-sm font-medium">
              {t("purchaseFilters.advancedFilters") || "פילטרים מתקדמים"}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Amount Range */}
              <div>
                <Label className="text-sm font-medium">
                  {t("purchaseFilters.amountRange") || "טווח סכומים (ש״ח)"}
                </Label>
                <div
                  className={`flex items-center gap-2 mt-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
                >
                  <Input
                    type="number"
                    placeholder={t("purchaseFilters.minAmount") || "מינימום"}
                    value={filters.amountMin || ""}
                    onChange={e =>
                      onFiltersChange({
                        ...filters,
                        amountMin: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="flex-1"
                    dir={dir}
                  />
                  <span className="text-sm text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder={t("purchaseFilters.maxAmount") || "מקסימום"}
                    value={filters.amountMax || ""}
                    onChange={e =>
                      onFiltersChange({
                        ...filters,
                        amountMax: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                    className="flex-1"
                    dir={dir}
                  />
                </div>
              </div>

              {/* Additional Status Options */}
              <div>
                <Label className="text-sm font-medium">
                  {t("purchaseFilters.additionalStatuses") || "סטטוסים נוספים"}
                </Label>
                <div className="mt-2 space-y-2">
                  {transactionStatuses.slice(4).map(status => (
                    <div
                      key={status.value}
                      className={`flex items-center ${dir === "rtl" ? "space-x-reverse space-x-2" : "space-x-2"}`}
                    >
                      <Checkbox
                        id={`advanced-status-${status.value}`}
                        checked={filters.status?.includes(status.value) || false}
                        onCheckedChange={checked =>
                          handleStatusChange(status.value, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`advanced-status-${status.value}`}
                        className="text-sm cursor-pointer"
                      >
                        {status.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="border-t pt-4">
            <div
              className={`flex items-center justify-between ${dir === "rtl" ? "flex-row-reverse" : ""}`}
            >
              <span className="text-sm font-medium">
                {t("purchaseFilters.activeFilters") || "פילטרים פעילים"}: {activeFiltersCount}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className={`text-muted-foreground hover:text-foreground ${dir === "rtl" ? "flex-row-reverse" : ""}`}
              >
                {t("purchaseFilters.clearAll") || "נקה הכל"}
              </Button>
            </div>

            {/* Filter Tags */}
            <div className={`flex flex-wrap gap-2 mt-2 ${dir === "rtl" ? "flex-row-reverse" : ""}`}>
              {filters.search && (
                <Badge
                  variant="secondary"
                  className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
                >
                  {t("purchaseFilters.search") || "חיפוש"}: {filters.search}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => onFiltersChange({ ...filters, search: undefined })}
                  />
                </Badge>
              )}
              {filters.type?.map(type => (
                <Badge
                  key={type}
                  variant="secondary"
                  className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
                >
                  {transactionTypes.find(t => t.value === type)?.label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleTypeChange(type, false)}
                  />
                </Badge>
              ))}
              {filters.status?.map(status => (
                <Badge
                  key={status}
                  variant="secondary"
                  className={`flex items-center gap-1 ${dir === "rtl" ? "flex-row-reverse" : ""}`}
                >
                  {transactionStatuses.find(s => s.value === status)?.label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleStatusChange(status, false)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
