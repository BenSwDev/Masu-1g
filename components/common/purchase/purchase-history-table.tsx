"use client"

import { useState } from "react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { formatPhoneForDisplay } from "@/lib/utils/phone-utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  Eye,
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
  const { t, dir } = useTranslation()
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
                  <p className="font-medium">{formatPhoneForDisplay(voucherDetails.recipientPhone || "")}</p>
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
      <Card dir={dir}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card dir={dir}>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {t('purchaseHistory.noTransactions') || 'אין עסקאות'}
          </h3>
          <p className="text-muted-foreground">
            {t('purchaseHistory.noTransactionsDesc') || 'לא נמצאו עסקאות התואמות את הקריטריונים שנבחרו'}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div dir={dir}>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {t('purchaseHistory.table.type') || 'סוג'}
                </TableHead>
                <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {t('purchaseHistory.table.description') || 'תיאור'}
                </TableHead>
                <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {t('purchaseHistory.table.date') || 'תאריך'}
                </TableHead>
                <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {t('purchaseHistory.table.amount') || 'סכום'}
                </TableHead>
                <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {t('purchaseHistory.table.status') || 'סטטוס'}
                </TableHead>
                {showCustomerInfo && (
                  <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                    {t('purchaseHistory.table.customer') || 'לקוח'}
                  </TableHead>
                )}
                <TableHead className={dir === 'rtl' ? 'text-right' : 'text-left'}>
                  {t('purchaseHistory.table.actions') || 'פעולות'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
                      {getTypeIcon(transaction.type)}
                      <span className="text-sm font-medium">
                        {getTypeText(transaction.type)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs truncate" title={transaction.description}>
                      {transaction.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {formatDate(transaction.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {transaction.finalAmount !== undefined
                        ? formatCurrency(transaction.finalAmount)
                        : formatCurrency(transaction.amount)}
                    </div>
                    {transaction.finalAmount !== undefined && transaction.finalAmount !== transaction.amount && (
                      <div className="text-xs text-muted-foreground line-through">
                        {formatCurrency(transaction.amount)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(transaction.status)}>
                      {getStatusText(transaction.status)}
                    </Badge>
                  </TableCell>
                  {showCustomerInfo && (
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {transaction.customerName || 'לא ידוע'}
                        </div>
                        {transaction.customerEmail && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.customerEmail}
                          </div>
                        )}
                        {transaction.customerPhone && (
                          <div className="text-xs text-muted-foreground">
                            {transaction.customerPhone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedTransaction(transaction)}
                      className={`flex items-center gap-1 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
                    >
                      <Eye className="h-4 w-4" />
                      {t('purchaseHistory.viewDetails') || 'צפה בפרטים'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir={dir}>
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              {selectedTransaction && getTypeIcon(selectedTransaction.type)}
              {t('purchaseHistory.transactionDetails') || 'פרטי עסקה'}
            </DialogTitle>
            <DialogDescription>
              {selectedTransaction && (
                `${getTypeText(selectedTransaction.type)} • ${formatDate(selectedTransaction.date)}`
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('purchaseHistory.details.amount') || 'סכום'}:
                  </p>
                  <p className="font-medium text-lg">
                    {selectedTransaction.finalAmount !== undefined
                      ? formatCurrency(selectedTransaction.finalAmount)
                      : formatCurrency(selectedTransaction.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('purchaseHistory.details.status') || 'סטטוס'}:
                  </p>
                  <Badge variant={getStatusBadgeVariant(selectedTransaction.status)}>
                    {getStatusText(selectedTransaction.status)}
                  </Badge>
                </div>
              </div>

              {/* Customer Info for Admin */}
              {showCustomerInfo && selectedTransaction.customerName && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t('purchaseHistory.details.customerInfo') || 'פרטי לקוח'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t('purchaseHistory.details.customerName') || 'שם לקוח'}:
                      </p>
                      <p className="font-medium">{selectedTransaction.customerName}</p>
                    </div>
                    {selectedTransaction.customerEmail && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t('purchaseHistory.details.customerEmail') || 'אימייל'}:
                        </p>
                        <p className="font-medium">{selectedTransaction.customerEmail}</p>
                      </div>
                    )}
                    {selectedTransaction.customerPhone && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {t('purchaseHistory.details.customerPhone') || 'טלפון'}:
                        </p>
                        <p className="font-medium">{selectedTransaction.customerPhone}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Type-specific details */}
              <div className="border-t pt-4">
                {selectedTransaction.type === 'booking' && (
                  <BookingDetails details={selectedTransaction.details as any} />
                )}
                {selectedTransaction.type === 'subscription' && (
                  <SubscriptionDetails details={selectedTransaction.details as any} />
                )}
                {selectedTransaction.type === 'gift_voucher' && (
                  <GiftVoucherDetails details={selectedTransaction.details as any} />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Helper components for different transaction types
function BookingDetails({ details }: { details: any }) {
  const { t, dir } = useTranslation()
  
  return (
    <div>
      <h4 className={`font-semibold mb-3 flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Calendar className="h-4 w-4" />
        {t('purchaseHistory.bookingDetails.title') || 'פרטי הזמנה'}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.bookingDetails.bookingNumber') || 'מספר הזמנה'}:
          </p>
          <p className="font-medium">{details.bookingNumber}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.bookingDetails.treatmentName') || 'שם הטיפול'}:
          </p>
          <p className="font-medium">{details.treatmentName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.bookingDetails.dateTime') || 'תאריך ושעה'}:
          </p>
          <p className="font-medium">{format(new Date(details.dateTime), "dd/MM/yyyy HH:mm", { locale: he })}</p>
        </div>
        {details.professionalName && (
          <div>
            <p className="text-sm text-muted-foreground">
              {t('purchaseHistory.bookingDetails.professional') || 'מטפל'}:
            </p>
            <p className="font-medium">{details.professionalName}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function SubscriptionDetails({ details }: { details: any }) {
  const { t, dir } = useTranslation()
  
  return (
    <div>
      <h4 className={`font-semibold mb-3 flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Stethoscope className="h-4 w-4" />
        {t('purchaseHistory.subscriptionDetails.title') || 'פרטי מנוי'}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.subscriptionDetails.name') || 'שם המנוי'}:
          </p>
          <p className="font-medium">{details.subscriptionName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.subscriptionDetails.treatment') || 'טיפול'}:
          </p>
          <p className="font-medium">{details.treatmentName}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.subscriptionDetails.remaining') || 'נותר'}:
          </p>
          <p className="font-medium">{details.remainingQuantity} מתוך {details.quantity}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.subscriptionDetails.expiryDate') || 'תוקף עד'}:
          </p>
          <p className="font-medium">{format(new Date(details.expiryDate), "dd/MM/yyyy", { locale: he })}</p>
        </div>
      </div>
    </div>
  )
}

function GiftVoucherDetails({ details }: { details: any }) {
  const { t, dir } = useTranslation()
  
  return (
    <div>
      <h4 className={`font-semibold mb-3 flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <Gift className="h-4 w-4" />
        {t('purchaseHistory.voucherDetails.title') || 'פרטי שובר מתנה'}
      </h4>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.voucherDetails.code') || 'קוד השובר'}:
          </p>
          <p className="font-medium">{details.code}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.voucherDetails.type') || 'סוג השובר'}:
          </p>
          <p className="font-medium">
            {details.voucherType === 'monetary' ? 'שובר כספי' : 'שובר טיפול'}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.voucherDetails.remaining') || 'נותר'}:
          </p>
          <p className="font-medium">{details.remainingAmount} ש״ח מתוך {details.originalAmount} ש״ח</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            {t('purchaseHistory.voucherDetails.validUntil') || 'תוקף עד'}:
          </p>
          <p className="font-medium">{format(new Date(details.validUntil), "dd/MM/yyyy", { locale: he })}</p>
        </div>
      </div>
    </div>
  )
} 
