"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { 
  Calendar, 
  CreditCard, 
  Gift, 
  Users,
  Receipt,
  TrendingUp,
  TrendingDown,
  DollarSign
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/common/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"

interface DailyTransactionDetail {
  id: string
  type: 'booking' | 'voucher_new' | 'voucher_redeemed' | 'subscription_new' | 'subscription_redeemed' | 'coupon_new' | 'coupon_redeemed' | 'partner_coupon_new' | 'partner_coupon_redeemed'
  time: string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  amount: number
  professionalCost?: number
  description: string
  status: string
  paymentMethod?: string
  transactionId: string
}

interface DailySummary {
  date: string
  dayName: string
  totalTransactions: number
  totalRevenue: number
  totalRedemptions: number
  totalProfessionalCosts: number
  totalOfficeProfit: number
  breakdown: {
    bookings: { count: number; amount: number }
    newVouchers: { count: number; amount: number }
    redeemedVouchers: { count: number; amount: number }
    newSubscriptions: { count: number; amount: number }
    redeemedSubscriptions: { count: number; amount: number }
    newCoupons: { count: number; amount: number }
    redeemedCoupons: { count: number; amount: number }
    newPartnerCoupons: { count: number; amount: number }
    redeemedPartnerCoupons: { count: number; amount: number }
  }
}

interface DailyTransactionData {
  summary: DailySummary
  transactions: DailyTransactionDetail[]
}

interface AdminDailyTransactionsClientProps {
  date: string
}

export default function AdminDailyTransactionsClient({ date }: AdminDailyTransactionsClientProps) {
  const { t } = useTranslation()
  const [dailyData, setDailyData] = useState<DailyTransactionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("summary")

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount)
  }

  // Helper function to format time
  const formatTime = (timeString: string): string => {
    return new Date(timeString).toLocaleTimeString('he-IL', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Get transaction type display name
  const getTransactionTypeLabel = (type: string): string => {
    const typeLabels: Record<string, string> = {
      'booking': 'הזמנה',
      'voucher_new': 'שובר חדש',
      'voucher_redeemed': 'מימוש שובר',
      'subscription_new': 'מנוי חדש',
      'subscription_redeemed': 'מימוש מנוי',
      'coupon_new': 'קופון חדש',
      'coupon_redeemed': 'מימוש קופון',
      'partner_coupon_new': 'קופון שותף חדש',
      'partner_coupon_redeemed': 'מימוש קופון שותף'
    }
    return typeLabels[type] || type
  }

  // Get transaction type icon
  const getTransactionTypeIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'booking': <Calendar className="h-4 w-4" />,
      'voucher_new': <Gift className="h-4 w-4" />,
      'voucher_redeemed': <Gift className="h-4 w-4" />,
      'subscription_new': <CreditCard className="h-4 w-4" />,
      'subscription_redeemed': <CreditCard className="h-4 w-4" />,
      'coupon_new': <Receipt className="h-4 w-4" />,
      'coupon_redeemed': <Receipt className="h-4 w-4" />,
      'partner_coupon_new': <Users className="h-4 w-4" />,
      'partner_coupon_redeemed': <Users className="h-4 w-4" />
    }
    return iconMap[type] || <DollarSign className="h-4 w-4" />
  }

  // Get transaction type color
  const getTransactionTypeColor = (type: string): string => {
    if (type.includes('_new')) return 'bg-green-100 text-green-800'
    if (type.includes('_redeemed')) return 'bg-blue-100 text-blue-800'
    if (type === 'booking') return 'bg-purple-100 text-purple-800'
    return 'bg-gray-100 text-gray-800'
  }

  // Load daily transaction data
  const loadDailyData = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch(`/api/admin/transactions/daily?date=${date}`)
      
      if (!response.ok) {
        throw new Error('Failed to load daily transactions data')
      }
      
      const _data = await response.json()
      setDailyData(data)
    } catch (err) {
      setError(t('transactions.errors.dayDetailsFailed'))
      console.error('Error loading daily transactions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadDailyData()
  }, [date])

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">{t('transactions.loadingData')}</div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">{error}</div>
          <Button 
            onClick={loadDailyData} 
            className="mt-4 mx-auto block"
            variant="outline"
          >
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!dailyData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            {t('transactions.noData')}
          </div>
        </CardContent>
      </Card>
    )
  }

  const { summary, transactions } = dailyData

  return (
    <div className="space-y-6">
      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">סך הכנסות</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalRevenue)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">סך מימושים</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.totalRedemptions)}
                </p>
              </div>
              <TrendingDown className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">עלות מטפלים</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(summary.totalProfessionalCosts)}
                </p>
              </div>
              <Users className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">רווח למשרד</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(summary.totalOfficeProfit)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Summary and Transactions */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">סיכום פרטני</TabsTrigger>
          <TabsTrigger value="transactions">רשימת עסקאות ({transactions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>פירוט לפי סוגי עסקאות</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold">הזמנות</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    כמות: {summary.breakdown.bookings.count}
                  </div>
                  <div className="text-lg font-bold text-purple-600">
                    {formatCurrency(summary.breakdown.bookings.amount)}
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">שוברים חדשים</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    כמות: {summary.breakdown.newVouchers.count}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(summary.breakdown.newVouchers.amount)}
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">שוברים מומשים</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    כמות: {summary.breakdown.redeemedVouchers.count}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(summary.breakdown.redeemedVouchers.amount)}
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">מנויים חדשים</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    כמות: {summary.breakdown.newSubscriptions.count}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(summary.breakdown.newSubscriptions.amount)}
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">מנויים מומשים</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    כמות: {summary.breakdown.redeemedSubscriptions.count}
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {formatCurrency(summary.breakdown.redeemedSubscriptions.amount)}
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Receipt className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">קופונים חדשים</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    כמות: {summary.breakdown.newCoupons.count}
                  </div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(summary.breakdown.newCoupons.amount)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">זמן</TableHead>
                      <TableHead className="text-right">סוג עסקה</TableHead>
                      <TableHead className="text-right">לקוח</TableHead>
                      <TableHead className="text-right">תיאור</TableHead>
                      <TableHead className="text-center">סכום</TableHead>
                      <TableHead className="text-center">עלות מטפל</TableHead>
                      <TableHead className="text-center">סטטוס</TableHead>
                      <TableHead className="text-right">מזהה עסקה</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="text-right font-medium">
                          {formatTime(transaction.time)}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <div className="flex items-center gap-2">
                            {getTransactionTypeIcon(transaction.type)}
                            <Badge 
                              variant="secondary" 
                              className={getTransactionTypeColor(transaction.type)}
                            >
                              {getTransactionTypeLabel(transaction.type)}
                            </Badge>
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-right">
                          {transaction.customerName ? (
                            <div className="text-sm">
                              <div className="font-medium">{transaction.customerName}</div>
                              {transaction.customerEmail && (
                                <div className="text-gray-500">{transaction.customerEmail}</div>
                              )}
                              {transaction.customerPhone && (
                                <div className="text-gray-500">{transaction.customerPhone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-right">
                          <div className="max-w-xs truncate" title={transaction.description}>
                            {transaction.description}
                          </div>
                        </TableCell>
                        
                        <TableCell className="text-center font-semibold">
                          <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(Math.abs(transaction.amount))}
                          </span>
                        </TableCell>
                        
                        <TableCell className="text-center">
                          {transaction.professionalCost ? (
                            <span className="text-orange-600">
                              {formatCurrency(transaction.professionalCost)}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        
                        <TableCell className="text-center">
                          <Badge 
                            variant={transaction.status === 'completed' ? 'default' : 'secondary'}
                          >
                            {transaction.status === 'completed' ? 'הושלם' : 
                             transaction.status === 'pending' ? 'ממתין' : 
                             transaction.status === 'failed' ? 'נכשל' : transaction.status}
                          </Badge>
                        </TableCell>
                        
                        <TableCell className="text-right font-mono text-sm">
                          {transaction.transactionId}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {transactions.length === 0 && (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-gray-500">
                  לא בוצעו עסקאות ביום זה
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 