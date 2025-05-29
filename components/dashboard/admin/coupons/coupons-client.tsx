"use client"

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Plus, Search, Edit, Trash, Tag, Calendar, Percent, DollarSign, FilterX } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { useState, useEffect } from "react"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { Pagination } from "@/components/common/ui/pagination"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"
import type { CouponPlain } from "./coupon-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import CouponForm from "./coupon-form"
import { createCoupon, updateCoupon, deleteCoupon, getCoupons } from "@/actions/coupon-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"

interface CouponsClientProps {
  coupons?: CouponPlain[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const CouponsClient = ({ coupons = [], pagination }: CouponsClientProps) => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(pagination?.page || 1)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentCoupon, setCurrentCoupon] = useState<CouponPlain | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [couponsList, setCouponsList] = useState<CouponPlain[]>(coupons)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [paginationData, setPaginationData] = useState(pagination)
  const [isSearching, setIsSearching] = useState(false)

  const fetchCoupons = async (page = 1, search = searchTerm, isActive?: boolean) => {
    setIsSearching(true)
    try {
      const options: any = { page, limit: 10 }

      if (search) {
        options.search = search
      }

      if (isActive !== undefined) {
        options.isActive = isActive
      }

      const result = await getCoupons(options)
      if (result.success) {
        setCouponsList(result.coupons)
        setPaginationData(result.pagination)
      } else {
        toast.error(result.error || t("coupons.fetchError"))
      }
    } catch (error) {
      toast.error(t("coupons.fetchError"))
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    // Only fetch if we're not on the initial load
    if (searchTerm || activeFilter !== "all" || currentPage > 1) {
      const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
      fetchCoupons(currentPage, searchTerm, isActive)
    }
  }, [currentPage, activeFilter])

  const handleSearch = () => {
    const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
    setCurrentPage(1) // Reset to first page on new search
    fetchCoupons(1, searchTerm, isActive)
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setActiveFilter("all")
    setCurrentPage(1)
    fetchCoupons(1, "", undefined)
  }

  // Filter coupons based on search term (client-side filtering as backup)
  const filteredCoupons = couponsList.filter((coupon) => {
    return !searchTerm || coupon.code?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
    fetchCoupons(page, searchTerm, isActive)
  }

  const handleCreate = async (data: CouponPlain) => {
    setIsLoading(true)
    try {
      const result = await createCoupon(data)
      if (result.success) {
        setCouponsList([result.coupon, ...couponsList])
        toast.success(t("coupons.createSuccess"))
        setIsCreateDialogOpen(false)
        fetchCoupons(
          currentPage,
          searchTerm,
          activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
        )
      } else {
        toast.error(result.error || t("coupons.createError"))
      }
    } catch (error) {
      toast.error(t("coupons.createError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (data: CouponPlain) => {
    if (!currentCoupon) return
    setIsLoading(true)
    try {
      const result = await updateCoupon(currentCoupon._id!, data)
      if (result.success) {
        setCouponsList(couponsList.map((c) => (c._id === currentCoupon._id ? result.coupon : c)))
        toast.success(t("coupons.updateSuccess"))
        setIsEditDialogOpen(false)
      } else {
        toast.error(result.error || t("coupons.updateError"))
      }
    } catch (error) {
      toast.error(t("coupons.updateError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (coupon: CouponPlain) => {
    setCurrentCoupon(coupon)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (coupon: CouponPlain) => {
    setCurrentCoupon(coupon)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!currentCoupon) return

    setIsLoading(true)
    try {
      const result = await deleteCoupon(currentCoupon._id)
      if (result.success) {
        setCouponsList(couponsList.filter((c) => c._id !== currentCoupon._id))
        toast.success(t("coupons.deleteSuccess"))
        setIsDeleteDialogOpen(false)

        // If we deleted the last item on a page, go to previous page
        if (couponsList.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1)
          fetchCoupons(
            currentPage - 1,
            searchTerm,
            activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
          )
        }
      } else {
        toast.error(result.error || t("coupons.deleteError"))
      }
    } catch (error) {
      toast.error(t("coupons.deleteError"))
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (coupon: CouponPlain) => {
    const now = new Date()
    const validFrom = new Date(coupon.validFrom)
    const validUntil = new Date(coupon.validUntil)

    if (!coupon.isActive) {
      return <Badge variant="secondary">{t("common.inactive")}</Badge>
    } else if (now < validFrom) {
      return <Badge variant="outline">{t("coupons.pending")}</Badge>
    } else if (now > validUntil) {
      return <Badge variant="destructive">{t("coupons.expired")}</Badge>
    } else {
      return <Badge variant="default">{t("common.active")}</Badge>
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("coupons.title")}</h1>
          <p className="text-gray-600">{t("coupons.description")}</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("coupons.addNew")}
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder={t("coupons.searchPlaceholder") || t("common.search")}
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

      {filteredCoupons.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500 mb-4">{t("coupons.noCoupons")}</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("coupons.addNew")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCoupons.map((coupon) => (
            <Card key={coupon._id} className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg flex items-center">
                    <Tag className="h-4 w-4 mr-2" />
                    {coupon.code}
                  </CardTitle>
                  {getStatusBadge(coupon)}
                </div>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    {coupon.discountType === "percentage" ? (
                      <Percent className="mr-2 h-4 w-4 text-gray-500" />
                    ) : (
                      <DollarSign className="mr-2 h-4 w-4 text-gray-500" />
                    )}
                    <span>
                      {t("coupons.fields.discountValue")}:{" "}
                      {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₪${coupon.discountValue}`}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    <span>
                      {t("coupons.fields.validFrom")}: {format(new Date(coupon.validFrom), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    <span>
                      {t("coupons.fields.validUntil")}: {format(new Date(coupon.validUntil), "dd/MM/yyyy")}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)}>
                  <Edit className="h-4 w-4 mr-1" />
                  {t("common.edit")}
                </Button>
                <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteClick(coupon)}>
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
        title={t("coupons.deleteConfirm") || t("common.deleteConfirm")}
        description={t("coupons.deleteConfirmDescription") || t("common.deleteConfirmDescription")}
      />

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("coupons.addNew")}</DialogTitle>
          </DialogHeader>
          <CouponForm onSubmit={handleCreate} isLoading={isLoading} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("coupons.edit")}</DialogTitle>
          </DialogHeader>
          {currentCoupon && <CouponForm onSubmit={handleUpdate} isLoading={isLoading} initialData={currentCoupon} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default CouponsClient
