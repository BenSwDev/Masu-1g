"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Plus, Search, Edit, Trash, Gift, Calendar, User, Check, X } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { useState } from "react"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { Pagination } from "@/components/common/ui/pagination"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"

interface GiftVouchersClientProps {
  giftVouchers?: any[]
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentVoucher, setCurrentVoucher] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Filter vouchers based on search term
  const filteredVouchers = giftVouchers.filter((voucher) => {
    return (
      !searchTerm ||
      voucher.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voucher.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voucher.senderName?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Here you would typically fetch data for the new page
  }

  const handleEdit = (voucher: any) => {
    setCurrentVoucher(voucher)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (voucher: any) => {
    setCurrentVoucher(voucher)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!currentVoucher) return

    setIsLoading(true)
    try {
      // Implement delete action here
      toast.success(t("giftVouchers.deleteSuccess"))
      setIsDeleteDialogOpen(false)
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (voucher: any) => {
    if (voucher.isRedeemed) {
      return <Badge variant="secondary">{t("giftVouchers.redeemed")}</Badge>
    } else if (new Date(voucher.expiryDate) < new Date()) {
      return <Badge variant="destructive">{t("giftVouchers.expired")}</Badge>
    } else {
      return <Badge variant="default">{t("giftVouchers.active")}</Badge>
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
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder={t("giftVouchers.searchPlaceholder")}
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
                  {t("giftVouchers.amount")}: ₪{voucher.amount.toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="space-y-2">
                  {voucher.recipientEmail && (
                    <div className="flex items-center text-sm">
                      <User className="mr-2 h-4 w-4 text-gray-500" />
                      <span>{voucher.recipientEmail}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm">
                    <Calendar className="mr-2 h-4 w-4 text-gray-500" />
                    <span>
                      {t("giftVouchers.expiresOn")}: {format(new Date(voucher.expiryDate), "dd/MM/yyyy")}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    {voucher.isRedeemed ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-green-500" />
                        <span>
                          {t("giftVouchers.redeemedOn")}: {format(new Date(voucher.redeemedDate), "dd/MM/yyyy")}
                        </span>
                      </>
                    ) : (
                      <>
                        <X className="mr-2 h-4 w-4 text-gray-500" />
                        <span>{t("giftVouchers.notRedeemed")}</span>
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
        title={t("giftVouchers.deleteConfirm")}
        description={t("giftVouchers.deleteConfirmDescription")}
      />
    </div>
  )
}

export default GiftVouchersClient
