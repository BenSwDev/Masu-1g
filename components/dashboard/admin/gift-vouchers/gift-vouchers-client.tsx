"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Filter, RotateCcw, Loader2, Gift, RefreshCw, Download, TrendingUp, Users, List, Grid3x3 } from "lucide-react"
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
import { CustomPagination as Pagination } from "@/components/common/ui/pagination"
import { useToast } from "@/components/common/ui/use-toast"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { useIsMobile } from "@/components/common/ui/use-mobile"
import { Badge } from "@/components/common/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { GiftVoucherForm } from "./gift-voucher-form"
import { GiftVoucherRow } from "./gift-voucher-row"
import GiftVoucherAdminCard from "./gift-voucher-admin-card"
import GiftVoucherAdminCardSkeleton from "./gift-voucher-admin-card-skeleton"
import AdminGiftVoucherDetailsModal from "./admin-gift-voucher-details-modal"
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
  const isMobile = useIsMobile()
  const [vouchers, setVouchers] = useState<GiftVoucherPlain[]>(initialVouchers)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [filterVoucherType, setFilterVoucherType] = useState<GiftVoucherPlain["voucherType"] | "all">("all")
  const [filterStatus, setFilterStatus] = useState<GiftVoucherPlain["status"] | "all">("all")
  const [filterDateRange, setFilterDateRange] = useState<DateRange | undefined>(undefined)
  
  // View state
  const [viewMode, setViewMode] = useState<"table" | "cards">(isMobile ? "cards" : "table")

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<GiftVoucherPlain | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [voucherToDeleteId, setVoucherToDeleteId] = useState<string | null>(null)
  const [selectedVoucher, setSelectedVoucher] = useState<GiftVoucherPlain | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const { t } = useTranslation()

  // Calculate statistics
  const stats = {
    total: pagination?.total || 0,
    active: vouchers.filter((v) => v.status === "active").length,
    used: vouchers.filter((v) => ["fully_used", "partially_used"].includes(v.status)).length,
    pending: vouchers.filter((v) => ["pending_payment", "pending_send"].includes(v.status)).length,
    revenue: vouchers.reduce((sum, v) => sum + (v.paymentAmount || 0), 0),
  }

  const loadVouchers = useCallback(
    async (page = 1, newSearch = search, newFilters?: any, showRefreshToast = false) => {
      setIsLoading(true)
      if (showRefreshToast) setIsRefreshing(true)
      
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
          if (showRefreshToast) {
            toast({ title: t("common.success"), description: t("giftVouchers.notifications.dataRefreshed") })
          }
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
        setIsRefreshing(false)
      }
    },
    [search, filterVoucherType, filterStatus, filterDateRange, pagination.limit, toast, t],
  )

  // Auto-detect mobile view
  useEffect(() => {
    setViewMode(isMobile ? "cards" : "table")
  }, [isMobile])

  useEffect(() => {
    // Debounce search or load on filter change
    const timer = setTimeout(() => {
      loadVouchers(1) // Reset to page 1 on filter change
    }, 500) // Debounce search/filter changes
    return () => clearTimeout(timer)
  }, [search, filterVoucherType, filterStatus, filterDateRange, loadVouchers])

  const handleSearchAndFilter = () => {
    setPagination({ ...pagination, page: 1 }) // Reset to first page on new search/filter
    loadVouchers(1, search, {
      voucherType: filterVoucherType === "all" ? undefined : filterVoucherType,
      status: filterStatus === "all" ? undefined : filterStatus,
      dateRange: filterDateRange
        ? {
            from: filterDateRange.from ? format(filterDateRange.from, "yyyy-MM-dd") : undefined,
            to: filterDateRange.to ? format(filterDateRange.to, "yyyy-MM-dd") : undefined,
          }
        : undefined,
    })
  }

  const handleRefresh = () => {
    loadVouchers(pagination.page, search, undefined, true)
  }

  const handleOpenFormModal = (voucher?: GiftVoucherPlain) => {
    setEditingVoucher(voucher || null)
    setIsFormModalOpen(true)
  }

  const handleViewDetails = (voucher: GiftVoucherPlain) => {
    setSelectedVoucher(voucher)
    setIsDetailsOpen(true)
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

  const handleCloseDetails = () => {
    setIsDetailsOpen(false)
    setSelectedVoucher(null)
  }

  const handleExport = () => {
    toast({ title: t("common.info"), description: t("common.featureComingSoon") })
  }

  const resetFilters = () => {
    setSearch("")
    setFilterVoucherType("all")
    setFilterStatus("all")
    setFilterDateRange(undefined)
    // loadVouchers will be called by useEffect
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination?.totalPages || 1)) {
      loadVouchers(newPage)
    }
  }

  const CardListSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {Array(pagination.limit || 6)
        .fill(0)
        .map((_, i) => (
          <GiftVoucherAdminCardSkeleton key={i} />
        ))}
    </div>
  )

  const TableSkeleton = () => (
    <div className="rounded-md border bg-card">
      <div className="hidden md:grid grid-cols-8 gap-4 p-4 font-semibold text-sm text-muted-foreground border-b">
        {Array(8).fill(0).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      {Array(pagination.limit || 10).fill(0).map((_, i) => (
        <div key={i} className="grid grid-cols-1 md:grid-cols-8 gap-4 p-4 border-b">
          {Array(8).fill(0).map((_, j) => (
            <div key={j} className="h-4 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t("giftVouchers.title")}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {t("giftVouchers.manage")} ({stats.total} {t("common.total")})
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isLoading}>
            <Download className="mr-2 h-4 w-4" />
            {t("common.export")}
          </Button>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
          <Button onClick={() => handleOpenFormModal()} disabled={isLoading}>
            <Plus className="mr-2 h-4 w-4" /> {t("giftVouchers.addNew")}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("common.total")}</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">{t("giftVouchers.totalVouchers")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("giftVouchers.statuses.active")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground">{t("giftVouchers.activeVouchers")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("giftVouchers.used")}</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.used}</div>
            <p className="text-xs text-muted-foreground">{t("giftVouchers.usedVouchers")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t("giftVouchers.revenue")}</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">₪{stats.revenue.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">{t("giftVouchers.totalRevenue")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("common.filters")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                    {t(`giftVouchers.types.${type}`)}
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
                    {t(`giftVouchers.statuses.${status}`)}
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
                  selected={filterDateRange?.from ? { from: filterDateRange.from, to: filterDateRange.to } : undefined}
                  onSelect={(date) => setFilterDateRange(date as any)}

                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={resetFilters} disabled={isLoading}>
              <RotateCcw className="mr-2 h-4 w-4" /> {t("giftVouchers.admin.clearFilters")}
            </Button>
            {!isMobile && (
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "cards" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("cards")}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading && vouchers.length === 0 && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">{t("common.loading")}</p>
        </div>
      )}

      {!isLoading && vouchers.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <Gift className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">{t("giftVouchers.noGiftVouchers")}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("giftVouchers.noVouchers")}</p>
            <div className="mt-6">
              <Button onClick={() => handleOpenFormModal()} disabled={isLoading}>
                <Plus className="mr-2 h-4 w-4" /> {t("giftVouchers.addNew")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content Area */}
      {vouchers.length > 0 && (
        <>
          {isLoading ? (
            viewMode === "cards" ? <CardListSkeleton /> : <TableSkeleton />
          ) : (
            <>
              {viewMode === "cards" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {vouchers.map((voucher) => (
                    <GiftVoucherAdminCard
                      key={voucher._id}
                      voucher={voucher}
                      onVoucherUpdate={() => loadVouchers(pagination.page)}
                      onEdit={handleOpenFormModal}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-md border bg-card">
                  <div className="hidden md:grid grid-cols-12 gap-4 p-4 font-semibold text-sm text-muted-foreground border-b">
                    <div className="col-span-1">{t("giftVouchers.fields.code")}</div>
                    <div className="col-span-1">{t("giftVouchers.fields.voucherType")}</div>
                    <div className="col-span-2">{t("giftVouchers.fields.owner")}</div>
                    <div className="col-span-2">{t("giftVouchers.purchase.guestInfo")}</div>
                    <div className="col-span-1">{t("giftVouchers.fields.amount")}</div>
                    <div className="col-span-1">{t("giftVouchers.fields.purchaseDate")}</div>
                    <div className="col-span-1">{t("giftVouchers.fields.validUntil")}</div>
                    <div className="col-span-1">{t("giftVouchers.fields.status")}</div>
                    <div className="col-span-1">{t("giftVouchers.purchase.sendAsGift")}</div>
                    <div className="col-span-1 text-right">{t("common.actions")}</div>
                  </div>
                  {vouchers.map((voucher) => (
                    <GiftVoucherRow
                      key={voucher._id}
                      voucher={voucher}
                      onEdit={() => handleOpenFormModal(voucher)}
                      onDelete={() => handleOpenDeleteDialog(voucher._id)}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {pagination.totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={handlePageChange}
            isLoading={isLoading}
          />
        </div>
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

      <AdminGiftVoucherDetailsModal
        voucher={selectedVoucher}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
      />
    </div>
  )
}
