"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Plus, Search, Edit, Trash, Gift, Calendar, Check, X, FilterX } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { useState, useEffect } from "react"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { Pagination } from "@/components/common/ui/pagination"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import GiftVoucherForm from "./gift-voucher-form"
import {
  createGiftVoucher,
  updateGiftVoucher,
  deleteGiftVoucher,
  getGiftVouchers,
} from "@/actions/gift-voucher-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"

interface GiftVouchersClientProps {
  giftVouchers?: IGiftVoucher[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const GiftVouchersClient = ({ giftVouchers = [], pagination }: GiftVouchersClientProps) => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(pagination?.page || 1)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentVoucher, setCurrentVoucher] = useState<IGiftVoucher | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [vouchers, setVouchers] = useState<IGiftVoucher[]>(giftVouchers)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [paginationData, setPaginationData] = useState(pagination)
  const [isSearching, setIsSearching] = useState(false)

  const fetchGiftVouchers = async (page = 1, search = searchTerm, isActive?: boolean) => {
    setIsSearching(true)
    try {
      const options: any = { page, limit: 10 }

      if (search) {
        options.search = search
      }

      if (isActive !== undefined) {
        options.isActive = isActive
      }

      const result = await getGiftVouchers(options)
      if (result.success) {
        setVouchers(result.giftVouchers)
        setPaginationData(result.pagination)
      } else {
        toast.error(result.error || t("giftVouchers.fetchError"))
      }
    } catch (error) {
      toast.error(t("giftVouchers.fetchError"))
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    // Only fetch if we're not on the initial load
    if (searchTerm || activeFilter !== "all" || currentPage > 1) {
      const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
      fetchGiftVouchers(currentPage, searchTerm, isActive)
    }
  }, [currentPage, activeFilter])

  const handleSearch = () => {
    const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
    setCurrentPage(1) // Reset to first page on new search
    fetchGiftVouchers(1, searchTerm, isActive)
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setActiveFilter("all")
    setCurrentPage(1)
    fetchGiftVouchers(1, "", undefined)
  }

  // Filter vouchers based on search term (client-side filtering as backup)
  const filteredVouchers = vouchers.filter((voucher) => {
    return !searchTerm || voucher.code?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
    fetchGiftVouchers(page, searchTerm, isActive)
  }

  const handleCreate = async (data: FormData) => {
    setIsLoading(true)
    try {
      const result = await createGiftVoucher(data)
      if (result.success) {
        setVouchers([result.giftVoucher, ...vouchers])
        toast.success(t("giftVouchers.createSuccess"))
        setIsCreateDialogOpen(false)
        // Refresh the list to ensure correct ordering and pagination
        fetchGiftVouchers(
          currentPage,
          searchTerm,
          activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
        )
      } else {
        toast.error(result.error || t("giftVouchers.createError"))
      }
    } catch (error) {
      toast.error(t("giftVouchers.createError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (data: FormData) => {
    if (!currentVoucher) return

    setIsLoading(true)
    try {
      const result = await updateGiftVoucher(currentVoucher._id, data)
      if (result.success) {
        setVouchers(vouchers.map((v) => (v._id === currentVoucher._id ? result.giftVoucher : v)))
        toast.success(t("giftVouchers.updateSuccess"))
        setIsEditDialogOpen(false)
      } else {
        toast.error(result.error || t("giftVouchers.updateError"))
      }
    } catch (error) {
      toast.error(t("giftVouchers.updateError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (voucher: IGiftVoucher) => {
    setCurrentVoucher(voucher)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (voucher: IGiftVoucher) => {
    setCurrentVoucher(voucher)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!currentVoucher) return

    setIsLoading(true)
    try {
      const result = await deleteGiftVoucher(currentVoucher._id)
      if (result.success) {
        setVouchers(vouchers.filter((v) => v._id !== currentVoucher._id))
        toast.success(t("giftVouchers.deleteSuccess"))
        setIsDeleteDialogOpen(false)

        // If we deleted the last item on a page, go to previous page
        if (vouchers.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1)
          fetchGiftVouchers(
            currentPage - 1,
            searchTerm,
            activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
          )
        }
      } else {
        toast.error(result.error || t("giftVouchers.deleteError"))
      }
    } catch (error) {
      toast.error(t("giftVouchers.deleteError"))
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (voucher: IGiftVoucher) => {
    const now = new Date()
    const validFrom = new Date(voucher.validFrom)
    const validUntil = new Date(voucher.validUntil)

    if (!voucher.isActive) {
      return <Badge variant="secondary">{t("common.inactive")}</Badge>
    } else if (now < validFrom) {
      return <Badge variant="outline">{t("giftVouchers.pending")}</Badge>
    } else if (now > validUntil) {
      return <Badge variant="destructive">{t("giftVouchers.expired")}</Badge>
    } else {
      return <Badge variant="default">{t("common.active")}</Badge>
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("giftVouchers.title")}</h1>
          <p className="text-gray-600">{t("giftVouchers.description")}</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("giftVouchers.addNew")}
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={activeFilter} onValueChange={setActiveFilter}>
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

      {filteredVouchers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500 mb-4">{t("giftVouchers.noGiftVouchers")}</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("giftVouchers.addNew")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVouchers.map((voucher) => (
            <Card key={voucher._id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center">
                    <Gift className="h-4 w-4 mr-2" />
                    {voucher.code}
                  </CardTitle>
                  {getStatusBadge(voucher)}
                </div>
                <CardDescription>
                  {t("giftVouchers.fields.value")}: ₪{voucher.value.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    <span>
                      {t("giftVouchers.fields.validFrom")}: {format(new Date(voucher.validFrom), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    <span>
                      {t("giftVouchers.fields.validUntil")}: {format(new Date(voucher.validUntil), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    {voucher.isActive ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>{t("common.active")}</span>
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4 text-gray-500" />
                        <span>{t("common.inactive")}</span>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(voucher)}>
                  <Edit className="h-4 w-4 mr-1" />
                  {t("common.edit")}
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteClick(voucher)}>
                  <Trash className="h-4 w-4 mr-1" />
                  {t("common.delete")}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {paginationData && paginationData.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={paginationData.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        loading={isLoading}
        title={t("giftVouchers.deleteConfirm") || t("common.deleteConfirm")}
        description={t("giftVouchers.deleteConfirmDescription") || t("common.deleteConfirmDescription")}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("giftVouchers.addNew")}</DialogTitle>
          </DialogHeader>
          <GiftVoucherForm onSubmit={handleCreate} isLoading={isLoading} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("giftVouchers.edit")}</DialogTitle>
          </DialogHeader>
          {currentVoucher && (
            <GiftVoucherForm onSubmit={handleUpdate} isLoading={isLoading} initialData={currentVoucher} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default GiftVouchersClient
