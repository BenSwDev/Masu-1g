"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Filter, RotateCcw, Loader2, Gift } from "lucide-react"
import { format } from "date-fns"

import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/common/ui/dialog"
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
import { Pagination } from "@/components/common/ui/pagination" // Assuming this is your custom pagination or shadcn's
import { useToast } from "@/components/common/ui/use-toast" // Corrected import path

import { GiftVoucherForm } from "./gift-voucher-form"
import { GiftVoucherRow } from "./gift-voucher-row"
import { getGiftVouchers, deleteGiftVoucher, type GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/common/ui/popover"
import { Calendar } from "@/components/common/ui/calendar"
import type { DateRange } from "react-day-picker"
import { useTranslation } from "@/lib/translations/i18n"

interface GiftVouchersClientProps {
  initialVouchers: GiftVoucherPlain[]
  initialPagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const VOUCHER_STATUSES: GiftVoucherPlain["status"][] = [
  "pending_payment",
  "active",
  "partially_used",
  "fully_used",
  "expired",
  "pending_send",
  "sent",
  "cancelled",
]
const VOUCHER_TYPES: GiftVoucherPlain["voucherType"][] = ["monetary", "treatment"]

export function GiftVouchersClient({ initialVouchers, initialPagination }: GiftVouchersClientProps) {
  const { toast } = useToast()
  const [vouchers, setVouchers] = useState<GiftVoucherPlain[]>(initialVouchers)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [filterVoucherType, setFilterVoucherType] = useState<GiftVoucherPlain["voucherType"] | "all">("all")
  const [filterStatus, setFilterStatus] = useState<GiftVoucherPlain["status"] | "all">("all")
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined)

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<GiftVoucherPlain | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [voucherToDeleteId, setVoucherToDeleteId] = useState<string | null>(null)

  const { t } = useTranslation()

  const loadVouchers = useCallback(
    async (page = 1, newSearch = search, newFilters?: any) => {
      setIsLoading(true)
      try {
        const currentFilters = newFilters || {
          voucherType: filterVoucherType === "all" ? undefined : filterVoucherType,
          status: filterStatus === "all" ? undefined : filterStatus,
          dateRange: filterDateRange
            ? {
                from: filterDateRange.from ? format(filterDateRange.from, "yyyy-MM-dd") : undefined,
                to: filterDateRange.to ? format(filterDateRange.to, "yyyy-MM-dd") : undefined,
              }
            : undefined,
        }

        const result = await getGiftVouchers(page, pagination.limit, newSearch, currentFilters)
        if (result.success && result.giftVouchers && result.pagination) {
          setVouchers(result.giftVouchers)
          setPagination(result.pagination)
        } else {
          toast({ title: "Error", description: result.error || "Failed to load gift vouchers", variant: "destructive" })
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An unexpected error occurred",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    },
    [search, filterVoucherType, filterStatus, filterDateRange, pagination.limit, toast],
  )

  useEffect(() => {
    // Debounce search or load on filter change
    const timer = setTimeout(() => {
      loadVouchers(1) // Reset to page 1 on filter change
    }, 500) // Debounce search/filter changes
    return () => clearTimeout(timer)
  }, [search, filterVoucherType, filterStatus, filterDateRange, loadVouchers])

  const handleOpenFormModal = (voucher?: GiftVoucherPlain) => {
    setEditingVoucher(voucher || null)
    setIsFormModalOpen(true)
  }

  const handleFormSuccess = () => {
    setIsFormModalOpen(false)
    setEditingVoucher(null)
    loadVouchers(pagination.page) // Reload current page or page 1
  }

  const handleOpenDeleteDialog = (id: string) => {
    setVoucherToDeleteId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!voucherToDeleteId) return
    setIsLoading(true)
    try {
      const result = await deleteGiftVoucher(voucherToDeleteId)
      if (result.success) {
        toast({ title: "Success", description: "Gift voucher deleted successfully." })
        loadVouchers(pagination.page) // Reload current page
      } else {
        throw new Error(result.error || "Failed to delete gift voucher")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setVoucherToDeleteId(null)
    }
  }

  const resetFilters = () => {
    setSearch("")
    setFilterVoucherType("all")
    setFilterStatus("all")
    setFilterDateRange(undefined)
    // loadVouchers will be called by useEffect
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("giftVouchers.title")}</h1>
        <Button onClick={() => handleOpenFormModal()} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" /> {t("giftVouchers.addNew")}
        </Button>
      </div>

      {/* Filters Section */}
      <div className="p-4 border rounded-lg space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Input
            placeholder={t("giftVouchers.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lg:col-span-2"
            disabled={isLoading}
          />
          <Select
            value={filterVoucherType}
            onValueChange={(value) => setFilterVoucherType(value as any)}
            disabled={isLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("giftVouchers.admin.filterByType")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {VOUCHER_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={t("giftVouchers.filterByStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {VOUCHER_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant={"outline"} className="w-full justify-start text-left font-normal" disabled={isLoading}>
                <Filter className="mr-2 h-4 w-4" />
                {filterDateRange?.from ? (
                  filterDateRange.to ? (
                    <>
                      {format(filterDateRange.from, "LLL dd, y")} - {format(filterDateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(filterDateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>{t("giftVouchers.fields.validFrom")}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filterDateRange?.from}
                selected={filterDateRange}
                onSelect={setFilterDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={resetFilters} disabled={isLoading}>
            <RotateCcw className="mr-2 h-4 w-4" /> {t("giftVouchers.admin.clearFilters")}
          </Button>
        </div>
      </div>

      {isLoading && vouchers.length === 0 && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">{t("common.loading")}</p>
        </div>
      )}

      {!isLoading && vouchers.length === 0 && (
        <div className="text-center py-10">
          <Gift className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t("giftVouchers.noGiftVouchers")}</h3>
          <p className="mt-1 text-sm text-gray-500">{t("giftVouchers.noVouchers")}</p>
          <div className="mt-6">
            <Button onClick={() => handleOpenFormModal()} disabled={isLoading}>
              <Plus className="mr-2 h-4 w-4" /> {t("giftVouchers.addNew")}
            </Button>
          </div>
        </div>
      )}

      {vouchers.length > 0 && (
        <div className="rounded-md border bg-card">
          <div className="hidden md:grid grid-cols-7 gap-4 p-4 font-semibold text-sm text-muted-foreground border-b">
            <div>{t("giftVouchers.fields.code")}</div>
            <div>{t("giftVouchers.fields.voucherType")}</div>
            <div>{t("giftVouchers.fields.owner")}</div>
            <div>{t("giftVouchers.fields.validFrom")}</div>
            <div>{t("giftVouchers.fields.status")}</div>
            <div>{t("giftVouchers.purchase.sendAsGift")}</div>
            <div className="text-right">{t("common.actions")}</div>
          </div>
          {vouchers.map((voucher) => (
            <GiftVoucherRow
              key={voucher._id}
              voucher={voucher}
              onEdit={() => handleOpenFormModal(voucher)}
              onDelete={() => handleOpenDeleteDialog(voucher._id)}
            />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={(newPage) => loadVouchers(newPage)}
          isLoading={isLoading}
        />
      )}

      <Dialog
        open={isFormModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingVoucher(null)
          }
          setIsFormModalOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVoucher ? t("giftVouchers.edit") : t("giftVouchers.addNew")}</DialogTitle>
            <DialogDescription>
              {editingVoucher ? `${t("giftVouchers.edit")} ${editingVoucher.code}.` : t("giftVouchers.description")}
            </DialogDescription>
          </DialogHeader>
          <GiftVoucherForm
            initialData={editingVoucher ?? undefined}
            onSuccess={handleFormSuccess}
            onCancel={() => {
              setIsFormModalOpen(false)
              setEditingVoucher(null)
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("giftVouchers.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("giftVouchers.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
