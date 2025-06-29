"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useTranslation } from "@/lib/translations/i18n"
import { getUserPurchaseHistory } from "@/actions/purchase-summary-actions"
import PurchaseHistoryTable from "@/components/common/purchase/purchase-history-table"
import PurchaseFiltersComponent from "@/components/common/purchase/purchase-filters"
import type { PurchaseTransaction, PurchaseFilters } from "@/lib/types/purchase-summary"
import { RefreshCw, Download, TrendingUp, Calendar, CreditCard, Gift } from "lucide-react"

export default function PurchaseHistoryClient() {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<Partial<PurchaseFilters>>({})
  const limit = 10

  const loadTransactions = async (page = 1, newFilters = filters) => {
    try {
      setLoading(true)
      const result = await getUserPurchaseHistory(page, limit, newFilters)
      
      if (result.success && result.data) {
        setTransactions(result.data.transactions)
        setCurrentPage(result.data.currentPage)
        setTotalPages(result.data.totalPages)
        setTotalCount(result.data.totalCount)
      } else {
        toast({
          title: t('purchaseHistory.error.loadFailed') || 'שגיאה בטעינת הנתונים',
          description: result.error || t('common.unknownError'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading purchase history:', error)
      toast({
        title: t('purchaseHistory.error.loadFailed') || 'שגיאה בטעינת הנתונים',
        description: t('common.unknownError') || 'אירעה שגיאה לא צפויה',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions(1, filters)
    setCurrentPage(1)
  }, [filters])

  const handleFiltersChange = (newFilters: Partial<PurchaseFilters>) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handlePageChange = (page: number) => {
    loadTransactions(page, filters)
  }

  const handleRefresh = () => {
    loadTransactions(currentPage, filters)
  }

  // Calculate summary stats from current data
  const summaryStats = {
    totalTransactions: totalCount,
    totalBookings: transactions.filter(t => t.type === 'booking').length,
    totalSubscriptions: transactions.filter(t => t.type === 'subscription').length,
    totalVouchers: transactions.filter(t => t.type === 'gift_voucher').length,
    totalSpent: transactions.reduce((sum, t) => sum + (t.finalAmount || t.amount), 0),
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('purchaseHistory.summary.totalTransactions') || 'סה״כ עסקאות'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalTransactions}</div>
            <p className="text-xs text-muted-foreground">
              {t('purchaseHistory.summary.allTime') || 'מכל הזמנים'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('purchaseHistory.summary.totalBookings') || 'הזמנות'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalBookings}</div>
            <p className="text-xs text-muted-foreground">
              {t('purchaseHistory.summary.treatmentBookings') || 'הזמנות טיפולים'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('purchaseHistory.summary.subscriptions') || 'מנויים'}
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {t('purchaseHistory.summary.purchasedSubscriptions') || 'מנויים שנרכשו'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('purchaseHistory.summary.vouchers') || 'שוברי מתנה'}
            </CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalVouchers}</div>
            <p className="text-xs text-muted-foreground">
              {t('purchaseHistory.summary.purchasedVouchers') || 'שוברים שנרכשו'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <PurchaseFiltersComponent
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        showAdvanced={true}
      />

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'רענן'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            disabled={transactions.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('purchaseHistory.export') || 'ייצא לאקסל'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {loading ? (
            t('common.loading') || 'טוען...'
          ) : (
            `${t('purchaseHistory.showing') || 'מציג'} ${Math.min((currentPage - 1) * limit + 1, totalCount)}-${Math.min(currentPage * limit, totalCount)} ${t('purchaseHistory.of') || 'מתוך'} ${totalCount} ${t('purchaseHistory.results') || 'תוצאות'}`
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <PurchaseHistoryTable
        transactions={transactions}
        isLoading={loading}
        showCustomerInfo={false}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage > 1) handlePageChange(currentPage - 1)
                  }}
                  className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1
                const showPage = 
                  page === 1 || 
                  page === totalPages || 
                  (page >= currentPage - 2 && page <= currentPage + 2)
                
                if (!showPage) {
                  if (page === currentPage - 3 || page === currentPage + 3) {
                    return (
                      <PaginationItem key={page}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )
                  }
                  return null
                }
                
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault()
                        handlePageChange(page)
                      }}
                      isActive={currentPage === page}
                    >
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                )
              })}
              
              <PaginationItem>
                <PaginationNext 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (currentPage < totalPages) handlePageChange(currentPage + 1)
                  }}
                  className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Empty State Message */}
      {!loading && transactions.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-6">
              <TrendingUp className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {t('purchaseHistory.emptyState.title') || 'אין עסקאות להצגה'}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {Object.keys(filters).length > 0
                ? (t('purchaseHistory.emptyState.withFilters') || 'לא נמצאו עסקאות התואמות לפילטרים שנבחרו. נסה לשנות את הפילטרים.')
                : (t('purchaseHistory.emptyState.noTransactions') || 'עדיין לא ביצעת רכישות או הזמנות. התחל לחקור את השירותים שלנו!')
              }
            </p>
            {Object.keys(filters).length > 0 ? (
              <Button onClick={handleClearFilters} variant="outline">
                {t('purchaseHistory.emptyState.clearFilters') || 'נקה פילטרים'}
              </Button>
            ) : (
              <div className="flex gap-2 justify-center">
                <Button asChild>
                  <a href="/bookings/treatment">
                    {t('purchaseHistory.emptyState.bookTreatment') || 'הזמן טיפול'}
                  </a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/purchase/subscription">
                    {t('purchaseHistory.emptyState.buySubscription') || 'רכוש מנוי'}
                  </a>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 
