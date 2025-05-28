"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
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
import { DiscountType, type IBundle } from "@/lib/db/models/bundle"
import { Package, MoreVertical, Calendar, Gift, Clock, Loader2 } from "lucide-react"
import { useTranslation } from "@/lib/translations/i18n"
import { useDirection } from "@/lib/translations/i18n"

interface BundleCardProps {
  bundle: IBundle
  onEdit: (bundle: IBundle) => void
  onDelete: (id: string) => Promise<boolean>
  onDuplicate: (id: string) => Promise<boolean>
  onToggleStatus: (id: string) => Promise<boolean>
}

export function BundleCard({ bundle, onEdit, onDelete, onDuplicate, onToggleStatus }: BundleCardProps) {
  const { t } = useTranslation("common")
  const { dir } = useDirection()

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const success = await onDelete(bundle._id.toString())
      if (!success) {
        setShowDeleteDialog(false)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      await onDuplicate(bundle._id.toString())
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true)
    try {
      await onToggleStatus(bundle._id.toString())
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const formatDiscountValue = () => {
    switch (bundle.discountType) {
      case DiscountType.FREE_QUANTITY:
        return t("admin.bundles.discount.freeQuantity", { value: bundle.discountValue })
      case DiscountType.PERCENTAGE:
        return t("admin.bundles.discount.percentage", { value: bundle.discountValue })
      case DiscountType.FIXED_AMOUNT:
        return t("admin.bundles.discount.fixedAmount", { value: bundle.discountValue })
      default:
        return ""
    }
  }

  const flexDirection = dir === "rtl" ? "flex-row-reverse" : "flex-row"
  const marginClass = dir === "rtl" ? "ml-0 mr-2" : "ml-2 mr-0"
  const marginClassReverse = dir === "rtl" ? "mr-4" : "ml-4"
  const textAlign = dir === "rtl" ? "text-right" : "text-left"

  return (
    <>
      <Card className="w-full overflow-hidden border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-0">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`flex items-center ${flexDirection}`}>
                <Package className={`w-5 h-5 ${marginClass} text-teal-500`} />
                <h3 className="text-lg font-semibold">{bundle.name}</h3>
              </div>
              <div className="flex items-center">
                <Switch
                  checked={bundle.isActive}
                  onCheckedChange={handleToggleStatus}
                  disabled={isTogglingStatus}
                  className={`${marginClassReverse} data-[state=checked]:bg-teal-500 ${
                    dir === "rtl" ? "data-[state=checked]:justify-start data-[state=unchecked]:justify-end" : ""
                  }`}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isDeleting || isDuplicating || isTogglingStatus}>
                      {isDeleting || isDuplicating || isTogglingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MoreVertical className="w-4 h-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align={dir === "rtl" ? "start" : "end"}>
                    <DropdownMenuItem onClick={() => onEdit(bundle)}>
                      {t("admin.bundles.actions.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
                      {isDuplicating ? t("admin.bundles.actions.duplicating") : t("admin.bundles.actions.duplicate")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600"
                      disabled={isDeleting}
                    >
                      {isDeleting ? t("admin.bundles.actions.deleting") : t("admin.bundles.actions.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-4">
              <div className={`text-sm text-gray-500 mb-2 ${textAlign}`}>
                {t("admin.bundles.card.category")}:{" "}
                {t(`categories.${bundle.category}`, { defaultValue: bundle.category })}
              </div>
              {bundle.description && <p className={`text-sm text-gray-700 ${textAlign}`}>{bundle.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className={`flex items-center ${flexDirection}`}>
                <Package className={`w-4 h-4 ${marginClass} text-gray-500`} />
                <span className="text-sm">{t("admin.bundles.card.treatments", { count: bundle.quantity })}</span>
              </div>
              <div className={`flex items-center ${flexDirection}`}>
                <Calendar className={`w-4 h-4 ${marginClass} text-gray-500`} />
                <span className="text-sm">{t("admin.bundles.card.validity", { months: bundle.validityMonths })}</span>
              </div>
              <div className={`flex items-center ${flexDirection}`}>
                <Gift className={`w-4 h-4 ${marginClass} text-gray-500`} />
                <span className="text-sm">{formatDiscountValue()}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className={`text-sm font-medium mb-2 ${textAlign}`}>
                {t("admin.bundles.card.availableTreatments")}:
              </h4>
              <div className="space-y-1">
                {Array.isArray(bundle.treatments) && bundle.treatments.length > 0 ? (
                  bundle.treatments.map((treatment, index) => (
                    <div className={`flex items-center text-sm ${flexDirection}`} key={index}>
                      <Clock className={`w-3 h-3 ${dir === "rtl" ? "ml-0 mr-1" : "ml-1 mr-0"} text-gray-400`} />
                      {treatment.name}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">{t("admin.bundles.card.noTreatments")}</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.bundles.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("admin.bundles.deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter
            className={`${dir === "rtl" ? "flex-row sm:justify-start" : "flex-row-reverse sm:justify-end"}`}
          >
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className={`${dir === "rtl" ? "ml-0 mr-2" : "ml-2 mr-0"} h-4 w-4 animate-spin`} />
                  {t("admin.bundles.actions.deleting")}
                </>
              ) : (
                t("admin.bundles.actions.confirmDelete")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
