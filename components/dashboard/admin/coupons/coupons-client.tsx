"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Plus, Search, Edit, Trash, Tag, Calendar, Percent, Users } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { useState } from "react"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { Pagination } from "@/components/common/ui/pagination"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"

interface CouponsClientProps {
  coupons?: any[]
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentCoupon, setCurrentCoupon] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Filter coupons based on search term
  const filteredCoupons = coupons.filter((coupon) => {
    return (
      !searchTerm ||
      coupon.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      coupon.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Here you would typically fetch data for the new page
  }

  const handleEdit = (coupon: any) => {
    setCurrentCoupon(coupon)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (coupon: any) => {
    setCurrentCoupon(coupon)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!currentCoupon) return

    setIsLoading(true)
    try {
      // Implement delete action here
      toast.success(t("coupons.deleteSuccess"))
      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (coupon: any) => {
    if (!coupon.isActive) {
      return <Badge variant="secondary">{t("common.inactive")}</Badge>
    } else if (new Date(coupon.expiryDate) < new Date()) {
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
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder={t("coupons.searchPlaceholder")}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
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
                {coupon.description && <CardDescription>{coupon.description}</CardDescription>}
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <Percent className="mr-2 h-4 w-4 text-gray-500" />
                    <span>
                      {t("coupons.discount")}:{" "}
                      {coupon.discountType === "percentage" ? `${coupon.discount}%` : `₪${coupon.discount}`}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    <span>
                      {t("coupons.expiresOn")}: {format(new Date(coupon.expiryDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                  {coupon.maxUses && (
                    <div className="flex items-center text-sm">
                      <Users className="mr-2 h-4 w-4 text-gray-500" />
                      <span>
                        {t("coupons.usage")}: {coupon.usedCount || 0} / {coupon.maxUses}
                      </span>
                    </div>
                  )}
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination currentPage={currentPage} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        loading={isLoading}
        title={t("coupons.deleteConfirm")}
        description={t("coupons.deleteConfirmDescription")}
      />
    </div>
  )
}

export default CouponsClient
