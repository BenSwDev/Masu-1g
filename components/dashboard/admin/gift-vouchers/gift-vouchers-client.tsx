"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, FilterX, Loader2, Gift } from "lucide-react"

import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent } from "@/components/common/ui/card"
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
import { useToast } from "@/components/common/ui/use-toast" // Corrected import path

import { GiftVoucherForm } from "./gift-voucher-form"
import { GiftVoucherRow } from "./gift-voucher-row"
import AdminGiftVoucherDetailsModal from "./admin-gift-voucher-details-modal"
import { getGiftVouchers, deleteGiftVoucher, type GiftVoucherPlain } from "@/actions/gift-voucher-actions"
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


export function GiftVouchersClient({ initialVouchers, initialPagination }: GiftVouchersClientProps) {
  const { toast } = useToast()
  const [vouchers, setVouchers] = useState<GiftVoucherPlain[]>(initialVouchers)
  const [pagination, setPagination] = useState(initialPagination)
  const [isLoading, setIsLoading] = useState(false)

  // Filters
  const [search, setSearch] = useState("")
  const [filterActive, setFilterActive] = useState<string>("all")

  const [isFormModalOpen, setIsFormModalOpen] = useState(false)
  const [editingVoucher, setEditingVoucher] = useState<GiftVoucherPlain | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [voucherToDeleteId, setVoucherToDeleteId] = useState<string | null>(null)
  const [selectedVoucher, setSelectedVoucher] = useState<GiftVoucherPlain | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const { t } = useTranslation()

  const fetchVouchers = useCallback(
    async (page = 1, newSearch = search, newFilters?: any) => {
      setIsSearching(true)
      try {
        const currentFilters = newFilters || {
          isActive: filterActive === "all" ? undefined : filterActive === "active",
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
        setIsSearching(false)
      }
    },
    [search, filterActive, pagination.limit, toast],
  )

  useEffect(() => {
    const isActive = filterActive === "active" ? true : filterActive === "inactive" ? false : undefined
    if (filterActive !== "all" || currentPage > 1) {
      fetchVouchers(currentPage, search, { isActive })
    }
  }, [currentPage, filterActive])

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
    fetchVouchers(pagination.page) // Reload current page or page 1
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
        fetchVouchers(pagination.page) // Reload current page
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

  const [currentPage, setCurrentPage] = useState(pagination.page)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = () => {
    const isActive = filterActive === "active" ? true : filterActive === "inactive" ? false : undefined
    setCurrentPage(1)
    fetchVouchers(1, search, { isActive })
  }

  const handleResetFilters = () => {
    setSearch("")
    setFilterActive("all")
    setCurrentPage(1)
    fetchVouchers(1, "", { isActive: undefined })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const isActive = filterActive === "active" ? true : filterActive === "inactive" ? false : undefined
    fetchVouchers(page, search, { isActive })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t("giftVouchers.title")}</h1>
        <Button onClick={() => handleOpenFormModal()} disabled={isLoading}>
          <Plus className="mr-2 h-4 w-4" /> {t("giftVouchers.addNew")}
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder={t("giftVouchers.searchPlaceholder") || t("common.search")}
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={filterActive} onValueChange={setFilterActive}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? t("common.searching") : t("common.search")}
              </Button>
              <Button variant="ghost" onClick={handleResetFilters} disabled={isSearching}>
                <FilterX className="h-4 w-4 mr-2" />
                {t("common.reset")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {isSearching && vouchers.length === 0 && (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">{t("common.loading")}</p>
        </div>
      )}

      {!isSearching && vouchers.length === 0 && (
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      {pagination.totalPages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={handlePageChange}
          isLoading={isSearching}
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

      <AdminGiftVoucherDetailsModal
        voucher={selectedVoucher}
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
      />
    </div>
  )
}
