"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
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
import { MoreVertical, CreditCard, Star, Edit, Trash2 } from "lucide-react"
import type { IPaymentMethod } from "@/lib/db/models/payment-method"
import { deletePaymentMethod, setDefaultPaymentMethod } from "@/actions/payment-method-actions"
import { toast } from "sonner"
import { useTranslation } from "@/lib/translations/i18n"

interface PaymentMethodCardProps {
  paymentMethod: IPaymentMethod
  onEdit: (paymentMethod: IPaymentMethod) => void
  onUpdate?: (paymentMethod: IPaymentMethod) => void
  onDelete?: (methodId: string) => void
  onSetDefault?: (methodId: string) => void
}

export function PaymentMethodCard({ paymentMethod, onEdit, onUpdate, onDelete, onSetDefault }: PaymentMethodCardProps) {
  const { t } = useTranslation()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const result = await deletePaymentMethod(paymentMethod._id)
      if (result.success) {
        toast.success(t("paymentMethods.deleted"))
        onDelete?.(paymentMethod._id) // עדכון מיידי
      } else {
        toast.error(t("paymentMethods.deleteError"))
      }
    } catch (error) {
      toast.error(t("paymentMethods.error"))
    } finally {
      setIsLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleSetDefault = async () => {
    if (paymentMethod.isDefault) return

    setIsLoading(true)
    try {
      const result = await setDefaultPaymentMethod(paymentMethod._id)
      if (result.success) {
        toast.success(t("paymentMethods.defaultSet"))
        onSetDefault?.(paymentMethod._id) // עדכון מיידי
      } else {
        toast.error(t("paymentMethods.setDefaultError"))
      }
    } catch (error) {
      toast.error(t("paymentMethods.setDefaultError"))
    } finally {
      setIsLoading(false)
    }
  }

  const getCardType = (cardNumber: string) => {
    const firstDigit = cardNumber.charAt(0)
    if (firstDigit === "4") return "Visa"
    if (firstDigit === "5") return "Mastercard"
    if (firstDigit === "3") return "American Express"
    return "כרטיס אשראי"
  }

  const maskCardNumber = (cardNumber: string) => {
    return `**** **** **** ${cardNumber.slice(-4)}`
  }

  return (
    <>
      <Card className="relative overflow-hidden transition-all duration-200 hover:shadow-lg mx-4 sm:mx-0">
        {/* Credit Card Design - Changed to teal/turquoise */}
        <div className="relative h-48 bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white p-6 rounded-t-lg">
          {/* Card Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-12 h-8 bg-white rounded opacity-50"></div>
            <div className="absolute top-4 right-20 w-8 h-8 bg-white rounded-full opacity-30"></div>
          </div>

          {/* Card Content */}
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <CreditCard className="w-6 h-6" />
                <span className="text-sm font-medium">{getCardType(paymentMethod.cardNumber)}</span>
              </div>
              {paymentMethod.isDefault && (
                <Badge variant="secondary" className="bg-yellow-500 text-yellow-900 border-0">
                  <Star className="w-3 h-3 mr-1" />
                  {t("paymentMethods.fields.isDefault")}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              {/* Card number - centered for RTL */}
              <div className="text-xl font-mono tracking-wider text-center">
                {maskCardNumber(paymentMethod.cardNumber)}
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="text-xs opacity-75 uppercase tracking-wide">
                    {t("paymentMethods.fields.cardHolderName")}
                  </div>
                  <div className="font-medium">{paymentMethod.cardHolderName}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs opacity-75 uppercase tracking-wide">{t("paymentMethods.fields.expiry")}</div>
                  {/* Expiry date - centered for RTL */}
                  <div className="font-mono text-center">
                    {paymentMethod.expiryMonth}/{paymentMethod.expiryYear}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card Details */}
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-gray-900">
                {paymentMethod.cardName || `כרטיס ${paymentMethod.cardNumber.slice(-4)}`}
              </h3>
              <p className="text-sm text-gray-500 text-center">
                {getCardType(paymentMethod.cardNumber)} • {maskCardNumber(paymentMethod.cardNumber)}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(paymentMethod)}>
                  <Edit className="mr-2 h-4 w-4" />
                  {t("common.edit")}
                </DropdownMenuItem>
                {!paymentMethod.isDefault && (
                  <DropdownMenuItem onClick={handleSetDefault} disabled={isLoading}>
                    <Star className="mr-2 h-4 w-4" />
                    {t("paymentMethods.setDefault")}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-red-600 focus:text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("common.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="mx-4 sm:mx-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("paymentMethods.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("paymentMethods.deleteConfirmDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isLoading} className="bg-red-600 hover:bg-red-700">
              {isLoading ? t("common.loading") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
