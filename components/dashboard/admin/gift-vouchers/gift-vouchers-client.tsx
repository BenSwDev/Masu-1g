"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Plus, Search, Edit, Trash, Gift, Calendar, Check, X } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { useState } from "react"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { Pagination } from "@/components/common/ui/pagination"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"
import { deleteGiftVoucher } from "@/actions/gift-voucher-actions"
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"

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

  // Filter vouchers based on search term
  const filteredVouchers = vouchers.filter((voucher) => {
    return !searchTerm || voucher.code?.toLowerCase().includes(searchTerm.toLowerCase())
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // TODO: Implement data fetching for new page
  }

  const handleEdit = (voucher: IGiftVoucher) => {
    // TODO: Implement edit functionality when form component is ready
    toast.info(t("common.comingSoon"))
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
        <Button onClick={() => toast.info(t("common.comingSoon"))}>
          <Plus className="h-4 w-4 mr-2" />
          {t("giftVouchers.addNew")}
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder={t("giftVouchers.searchPlaceholder") || t("common.search")}
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {filteredVouchers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500 mb-4">{t("giftVouchers.noGiftVouchers")}</p>
            <Button onClick={() => toast.info(t("common.comingSoon"))}>
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
        title={t("giftVouchers.deleteConfirm") || t("common.deleteConfirm")}
        description={t("giftVouchers.deleteConfirmDescription") || t("common.deleteConfirmDescription")}
      />
    </div>
  )
}

export default GiftVouchersClient
