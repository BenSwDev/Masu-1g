"use client"

import { useState } from "react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/common/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import { useTranslation } from "@/lib/translations/i18n"
import type { PurchaseTransaction } from "@/lib/types/purchase-summary"
import {
  Calendar,
  CreditCard,
  Gift,
  Stethoscope,
  Clock,
  User,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
} from "lucide-react"

interface PurchaseHistoryTableProps {
  transactions: PurchaseTransaction[]
  isLoading?: boolean
  showCustomerInfo?: boolean // For admin view
}

export default function PurchaseHistoryTable({
  transactions,
  isLoading = false,
  showCustomerInfo = false,
}: PurchaseHistoryTableProps) {
  const { t } = useTranslation()
  const [selectedTransaction, setSelectedTransaction] = useState<PurchaseTransaction | null>(null)

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed':
      case 'active':
        return 'default'
      case 'pending':
        return 'secondary'
      case 'cancelled':
      case 'expired':
        return 'destructive'
      case 'partially_used':
        return 'outline'
      case 'fully_used':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return t('purchaseHistory.status.completed') || 'הושלם'
      case 'active':
        return t('purchaseHistory.status.active') || 'פעיל'
      case 'pending':
        return t('purchaseHistory.status.pending') || 'ממתין'
      case 'cancelled':
        return t('purchaseHistory.status.cancelled') || 'בוטל'
      case 'expired':
        return t('purchaseHistory.status.expired') || 'פג תוקף'
      case 'partially_used':
        return t('purchaseHistory.status.partiallyUsed') || 'נוצל חלקית'
      case 'fully_used':
        return t('purchaseHistory.status.fullyUsed') || 'נוצל במלואו'
      default:
        return status
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'booking':
        return <Calendar className="h-4 w-4" />
      case 'subscription':
        return <Stethoscope className="h-4 w-4" />
      case 'gift_voucher':
        return <Gift className="h-4 w-4" />
      default:
        return <CreditCard className="h-4 w-4" />
    }
  }

  const getTypeText = (type: string) => {
    switch (type) {
      case 'booking':
        return t('purchaseHistory.type.booking') || 'הזמנה'
      case 'subscription':
        return t('purchaseHistory.type.subscription') || 'מנוי'
      case 'gift_voucher':
        return t('purchaseHistory.type.giftVoucher') || 'שובר מתנה'
      default:
        return type
    }
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0 ש״ח'
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount))
    if (isNaN(numericAmount)) return '0 ש״ח'
    return `${numericAmount.toFixed(0)} ש״ח`
  }

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: he })
  }

  const renderTransactionDetails = (transaction: PurchaseTransaction) => {
    const { type, details } = transaction

    if (type === 'booking') {
      const bookingDetails = details as any
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
              {t('purchaseHistory.bookingDetails.title') || 'פרטי הזמנה'}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.bookingDetails.bookingNumber') || 'מספר הזמנה'}:
              </p>
              <p className="font-medium">{bookingDetails.bookingNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.bookingDetails.treatmentName') || 'שם הטיפול'}:
              </p>
              <p className="font-medium">{bookingDetails.treatmentName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.bookingDetails.dateTime') || 'תאריך ושעה'}:
              </p>
              <p className="font-medium">{formatDate(bookingDetails.dateTime)}</p>
            </div>
            {bookingDetails.professionalName && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('purchaseHistory.bookingDetails.professional') || 'מטפל'}:
                </p>
                <p className="font-medium">{bookingDetails.professionalName}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.bookingDetails.source') || 'מקור'}:
              </p>
              <p className="font-medium">
                {bookingDetails.source === 'new_purchase' && (t('purchaseHistory.source.newPurchase') || 'רכישה חדשה')}
                {bookingDetails.source === 'subscription_redemption' && (t('purchaseHistory.source.subscription') || 'מימוש מנוי')}
                {bookingDetails.source === 'gift_voucher_redemption' && (t('purchaseHistory.source.voucher') || 'מימוש שובר')}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.bookingDetails.paymentStatus') || 'סטטוס תשלום'}:
              </p>
              <Badge variant={bookingDetails.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                {bookingDetails.paymentStatus === 'paid' && (t('purchaseHistory.payment.paid') || 'שולם')}
                {bookingDetails.paymentStatus === 'pending' && (t('purchaseHistory.payment.pending') || 'ממתין')}
                {bookingDetails.paymentStatus === 'failed' && (t('purchaseHistory.payment.failed') || 'נכשל')}
                {bookingDetails.paymentStatus === 'not_required' && (t('purchaseHistory.payment.notRequired') || 'לא נדרש')}
              </Badge>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">
              {t('purchaseHistory.bookingDetails.priceBreakdown') || 'פירוט מחיר'}
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>{t('purchaseHistory.bookingDetails.basePrice') || 'מחיר בסיס'}:</span>
                <span>{formatCurrency(bookingDetails.priceDetails.basePrice)}</span>
              </div>
              {bookingDetails.priceDetails.appliedDiscounts > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('purchaseHistory.bookingDetails.discount') || 'הנחה'}:</span>
                  <span>-{formatCurrency(bookingDetails.priceDetails.appliedDiscounts)}</span>
                </div>
              )}
              {bookingDetails.priceDetails.appliedVouchers > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{t('purchaseHistory.bookingDetails.voucherApplied') || 'שובר מוחל'}:</span>
                  <span>-{formatCurrency(bookingDetails.priceDetails.appliedVouchers)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold border-t pt-2">
                <span>{t('purchaseHistory.bookingDetails.finalAmount') || 'סכום סופי'}:</span>
                <span>{formatCurrency(bookingDetails.priceDetails.finalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (type === 'subscription') {
      const subscriptionDetails = details as any
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
              {t('purchaseHistory.subscriptionDetails.title') || 'פרטי מנוי'}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.subscriptionDetails.subscriptionName') || 'שם המנוי'}:
              </p>
              <p className="font-medium">{subscriptionDetails.subscriptionName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.subscriptionDetails.treatmentName') || 'שם הטיפול'}:
              </p>
              <p className="font-medium">{subscriptionDetails.treatmentName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.subscriptionDetails.quantity') || 'כמות'}:
              </p>
              <p className="font-medium">{subscriptionDetails.quantity}</p>
            </div>
            {subscriptionDetails.bonusQuantity > 0 && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('purchaseHistory.subscriptionDetails.bonusQuantity') || 'כמות בונוס'}:
                </p>
                <p className="font-medium">{subscriptionDetails.bonusQuantity}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.subscriptionDetails.usedQuantity') || 'כמות בשימוש'}:
              </p>
              <p className="font-medium">{subscriptionDetails.usedQuantity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.subscriptionDetails.remainingQuantity') || 'כמות נותרת'}:
              </p>
              <p className="font-medium">{subscriptionDetails.remainingQuantity}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.subscriptionDetails.expiryDate') || 'תאריך תפוגה'}:
              </p>
              <p className="font-medium">{formatDate(subscriptionDetails.expiryDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.subscriptionDetails.pricePerSession') || 'מחיר לסשן'}:
              </p>
              <p className="font-medium">{formatCurrency(subscriptionDetails.pricePerSession)}</p>
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between font-semibold">
              <span>{t('purchaseHistory.subscriptionDetails.totalPaid') || 'סכום ששולם'}:</span>
              <span>{formatCurrency(subscriptionDetails.totalPaid)}</span>
            </div>
          </div>
        </div>
      )
    }

    if (type === 'gift_voucher') {
      const voucherDetails = details as any
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">
              {t('purchaseHistory.voucherDetails.title') || 'פרטי שובר מתנה'}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.voucherDetails.code') || 'קוד שובר'}:
              </p>
              <p className="font-medium font-mono">{voucherDetails.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.voucherDetails.type') || 'סוג שובר'}:
              </p>
              <p className="font-medium">
                {voucherDetails.voucherType === 'monetary' ? 
                  (t('purchaseHistory.voucherDetails.monetary') || 'כספי') : 
                  (t('purchaseHistory.voucherDetails.treatment') || 'טיפול')}
              </p>
            </div>
            {voucherDetails.treatmentName && (
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('purchaseHistory.voucherDetails.treatmentName') || 'שם הטיפול'}:
                </p>
                <p className="font-medium">{voucherDetails.treatmentName}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.voucherDetails.originalAmount') || 'ערך מקורי'}:
              </p>
              <p className="font-medium">{formatCurrency(voucherDetails.originalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.voucherDetails.remainingAmount') || 'ערך נותר'}:
              </p>
              <p className="font-medium">{formatCurrency(voucherDetails.remainingAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {t('purchaseHistory.voucherDetails.validUntil') || 'תקף עד'}:
              </p>
              <p className="font-medium">{formatDate(voucherDetails.validUntil)}</p>
            </div>
            {voucherDetails.isGift && (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('purchaseHistory.voucherDetails.recipientName') || 'שם המקבל'}:
                  </p>
                  <p className="font-medium">{voucherDetails.recipientName || 'לא צוין'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('purchaseHistory.voucherDetails.recipientPhone') || 'טלפון המקבל'}:
                  </p>
                  <p className="font-medium">{voucherDetails.recipientPhone || 'לא צוין'}</p>
                </div>
              </>
            )}
          </div>

          {/* Usage history */}
          {voucherDetails.usageHistory && voucherDetails.usageHistory.length > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">
                {t('purchaseHistory.voucherDetails.usageHistory') || 'היסטוריית שימוש'}
              </h4>
              <div className="space-y-2">
                {voucherDetails.usageHistory.map((usage: any, index: number) => (
                  <div key={index} className="flex justify-between items-center text-sm bg-muted/50 p-2 rounded">
                    <div>
                      <p className="font-medium">{usage.description}</p>
                      <p className="text-muted-foreground">{formatDate(usage.date)}</p>
                    </div>
                    <p className="font-medium">{formatCurrency(usage.amountUsed)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )
    }

    return null
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="animate-pulse">
                <div className="h-12 bg-muted rounded-md"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">
            {t('purchaseHistory.noTransactions') || 'לא נמצאו עסקאות'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('purchaseHistory.table.type') || 'סוג'}</TableHead>
                <TableHead>{t('purchaseHistory.table.description') || 'תיאור'}</TableHead>
                <TableHead>{t('purchaseHistory.table.date') || 'תאריך'}</TableHead>
                <TableHead>{t('purchaseHistory.table.amount') || 'סכום'}</TableHead>
                <TableHead>{t('purchaseHistory.table.status') || 'סטטוס'}</TableHead>
                <TableHead>{t('purchaseHistory.table.actions') || 'פעולות'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTypeIcon(transaction.type)}
                      <span className="font-medium">{getTypeText(transaction.type)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">ID: {transaction.id.slice(-8)}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{format(new Date(transaction.date), "dd/MM/yyyy", { locale: he })}</p>
                      <p className="text-muted-foreground">
                        {format(new Date(transaction.date), "HH:mm", { locale: he })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      {transaction.finalAmount !== undefined && transaction.finalAmount !== transaction.amount ? (
                        <>
                          <p className="font-medium">{formatCurrency(transaction.finalAmount)}</p>
                          <p className="text-sm text-muted-foreground line-through">
                            {formatCurrency(transaction.amount)}
                          </p>
                        </>
                      ) : (
                        <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {getStatusText(transaction.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedTransaction(transaction)}
                    >
                      {t('purchaseHistory.table.viewDetails') || 'צפה בפרטים'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Details Modal */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedTransaction && getTypeIcon(selectedTransaction.type)}
              {selectedTransaction && getTypeText(selectedTransaction.type)} - 
              {t('purchaseHistory.modal.details') || 'פרטים'}
            </DialogTitle>
            <DialogDescription>
              {selectedTransaction && selectedTransaction.description}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTransaction && renderTransactionDetails(selectedTransaction)}
        </DialogContent>
      </Dialog>
    </>
  )
} 