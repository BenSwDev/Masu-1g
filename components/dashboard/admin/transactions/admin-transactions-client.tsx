"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react"
import { cn } from "@/lib/utils/utils"
import { useRouter } from "next/navigation"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/common/ui/table"

interface DayTransactionData {
  date: string
  dayName: string
  bookings: { count: number; amount: number }
  newVouchers: { count: number; amount: number }
  redeemedVouchers: { count: number; amount: number }
  newSubscriptions: { count: number; amount: number }
  redeemedSubscriptions: { count: number; amount: number }
  newCoupons: { count: number; amount: number }
  redeemedCoupons: { count: number; amount: number }
  newPartnerCoupons: { count: number; amount: number }
  redeemedPartnerCoupons: { count: number; amount: number }
  totalRevenue: number
  totalRedemptions: number
  professionalCosts: number
  officeProfit: number
}

interface WeeklyTransactionData {
  weekStart: string
  weekEnd: string
  days: DayTransactionData[]
  weeklyTotals: Omit<DayTransactionData, 'date' | 'dayName'>
}

export default function AdminTransactionsClient() {
  const { t } = useTranslation()
  const router = useRouter()
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()))
  const [weeklyData, setWeeklyData] = useState<WeeklyTransactionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Helper function to get the start of the week (Sunday)
  function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  // Helper function to get week end (Saturday)
  function getWeekEnd(weekStart: Date): Date {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    return weekEnd
  }

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS'
    }).format(amount)
  }

  // Load transactions data for the current week
  const loadWeeklyData = async (weekStart: Date) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const weekEnd = getWeekEnd(weekStart)
      const response = await fetch(`/api/admin/transactions/weekly?start=${weekStart.toISOString().split('T')[0]}&end=${weekEnd.toISOString().split('T')[0]}`)
      
      if (!response.ok) {
        throw new Error('Failed to load transactions data')
      }
      
      const _data = await response.json()
      setWeeklyData(data)
    } catch (err) {
      setError(t('transactions.errors.loadFailed'))
      console.error('Error loading weekly transactions:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // Navigate to previous/next week
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart)
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'prev' ? -7 : 7))
    setCurrentWeekStart(newWeekStart)
  }

  // Navigate to current week
  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()))
  }

  // Handle row click to navigate to daily details
  const handleRowClick = (date: string) => {
    router.push(`/dashboard/admin/transactions/${date}`)
  }

  // Load data when week changes
  useEffect(() => {
    loadWeeklyData(currentWeekStart)
  }, [currentWeekStart])

  const formatWeekRange = (start: Date, end: Date): string => {
    return `${start.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}`
  }

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
            onClick={() => loadWeeklyData(currentWeekStart)} 
            className="mt-4 mx-auto block"
            variant="outline"
          >
            נסה שוב
          </Button>
        </CardContent>
      </Card>
    )
  }

  const weekEnd = getWeekEnd(currentWeekStart)
  const isCurrentWeek = getWeekStart(new Date()).getTime() === currentWeekStart.getTime()

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t('transactions.weeklyReport')} - {formatWeekRange(currentWeekStart, weekEnd)}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('prev')}
              >
                <ChevronRight className="h-4 w-4" />
                {t('transactions.navigation.previousWeek')}
              </Button>
              
              {!isCurrentWeek && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={goToCurrentWeek}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  {t('transactions.navigation.currentWeek')}
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek('next')}
              >
                {t('transactions.navigation.nextWeek')}
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Weekly Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right font-semibold">{t('transactions.columns.date')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.bookings')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.newVouchers')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.redeemedVouchers')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.newSubscriptions')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.redeemedSubscriptions')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.newCoupons')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.redeemedCoupons')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.newPartnerCoupons')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[120px]">{t('transactions.columns.redeemedPartnerCoupons')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[100px]">{t('transactions.columns.totalRevenue')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[100px]">{t('transactions.columns.totalRedemptions')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[100px]">{t('transactions.columns.professionalCosts')}</TableHead>
                  <TableHead className="text-center font-semibold min-w-[100px]">{t('transactions.columns.officeProfit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyData?.days.map((day) => (
                  <TableRow 
                    key={day.date}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleRowClick(day.date)}
                    title={t('transactions.viewDayDetails')}
                  >
                    <TableCell className="text-right font-medium">
                      <div className="text-sm">
                        <div className="font-semibold">{day.dayName}</div>
                        <div className="text-gray-500">{new Date(day.date).toLocaleDateString('he-IL')}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.bookings.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.bookings.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.newVouchers.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.newVouchers.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.redeemedVouchers.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.redeemedVouchers.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.newSubscriptions.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.newSubscriptions.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.redeemedSubscriptions.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.redeemedSubscriptions.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.newCoupons.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.newCoupons.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.redeemedCoupons.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.redeemedCoupons.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.newPartnerCoupons.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.newPartnerCoupons.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-semibold">{day.redeemedPartnerCoupons.count}</div>
                        <div className="text-gray-500">{formatCurrency(day.redeemedPartnerCoupons.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center font-semibold text-green-600">
                      {formatCurrency(day.totalRevenue)}
                    </TableCell>
                    
                    <TableCell className="text-center font-semibold text-blue-600">
                      {formatCurrency(day.totalRedemptions)}
                    </TableCell>
                    
                    <TableCell className="text-center font-semibold text-orange-600">
                      {formatCurrency(day.professionalCosts)}
                    </TableCell>
                    
                    <TableCell className="text-center font-semibold text-purple-600">
                      {formatCurrency(day.officeProfit)}
                    </TableCell>
                  </TableRow>
                ))}

                {/* Weekly Summary Row */}
                {weeklyData?.weeklyTotals && (
                  <TableRow className="bg-gray-100 font-semibold border-t-2">
                    <TableCell className="text-right text-lg">
                      {t('transactions.summary.weekTotal')}
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.bookings.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.bookings.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.newVouchers.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.newVouchers.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.redeemedVouchers.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.redeemedVouchers.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.newSubscriptions.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.newSubscriptions.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.redeemedSubscriptions.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.redeemedSubscriptions.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.newCoupons.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.newCoupons.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.redeemedCoupons.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.redeemedCoupons.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.newPartnerCoupons.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.newPartnerCoupons.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center">
                      <div className="text-sm">
                        <div className="font-bold">{weeklyData.weeklyTotals.redeemedPartnerCoupons.count}</div>
                        <div className="text-gray-600">{formatCurrency(weeklyData.weeklyTotals.redeemedPartnerCoupons.amount)}</div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="text-center font-bold text-green-700 text-lg">
                      {formatCurrency(weeklyData.weeklyTotals.totalRevenue)}
                    </TableCell>
                    
                    <TableCell className="text-center font-bold text-blue-700 text-lg">
                      {formatCurrency(weeklyData.weeklyTotals.totalRedemptions)}
                    </TableCell>
                    
                    <TableCell className="text-center font-bold text-orange-700 text-lg">
                      {formatCurrency(weeklyData.weeklyTotals.professionalCosts)}
                    </TableCell>
                    
                    <TableCell className="text-center font-bold text-purple-700 text-lg">
                      {formatCurrency(weeklyData.weeklyTotals.officeProfit)}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {!weeklyData?.days.length && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center text-gray-500">
              {t('transactions.noData')}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
} 