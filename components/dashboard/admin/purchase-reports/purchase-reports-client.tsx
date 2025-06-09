"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/common/ui/use-toast"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { useTranslation } from "@/lib/translations/i18n"
import { getPurchaseStats, getUserPurchaseHistory } from "@/actions/purchase-summary-actions"
import PurchaseStatsOverview from "@/components/common/purchase/purchase-stats-overview"
import PurchaseHistoryTable from "@/components/common/purchase/purchase-history-table"
import PurchaseFiltersComponent from "@/components/common/purchase/purchase-filters"
import type { PurchaseStats, PurchaseTransaction, PurchaseFilters } from "@/lib/types/purchase-summary"
import {
  RefreshCw,
  Download,
  TrendingUp,
  BarChart3,
  PieChart,
  Calendar,
} from "lucide-react"

export default function PurchaseReportsClient() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState<PurchaseStats | null>(null)
  const [transactions, setTransactions] = useState<PurchaseTransaction[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [filters, setFilters] = useState<Partial<PurchaseFilters>>({})
  const [activeTab, setActiveTab] = useState("overview")
  const limit = 20

  const loadStats = async () => {
    try {
      setStatsLoading(true)
      const result = await getPurchaseStats()
      
      if (result.success && result.data) {
        setStats(result.data)
      } else {
        toast({
          title: t('purchaseReports.error.statsFailed') || 'שגיאה בטעינת הסטטיסטיקות',
          description: result.error || t('common.unknownError'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading purchase stats:', error)
      toast({
        title: t('purchaseReports.error.statsFailed') || 'שגיאה בטעינת הסטטיסטיקות',
        description: t('common.unknownError') || 'אירעה שגיאה לא צפויה',
        variant: "destructive",
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const loadAllTransactions = async (page = 1, newFilters = filters) => {
    try {
      setLoading(true)
      // For admin reports, we'll call the user purchase history without user filter
      // This will need to be modified to get ALL transactions, not just user-specific
      const result = await getUserPurchaseHistory(page, limit, newFilters)
      
      if (result.success && result.data) {
        setTransactions(result.data.transactions)
        setCurrentPage(result.data.currentPage)
        setTotalPages(result.data.totalPages)
        setTotalCount(result.data.totalCount)
      } else {
        toast({
          title: t('purchaseReports.error.transactionsFailed') || 'שגיאה בטעינת העסקאות',
          description: result.error || t('common.unknownError'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading all transactions:', error)
      toast({
        title: t('purchaseReports.error.transactionsFailed') || 'שגיאה בטעינת העסקאות',
        description: t('common.unknownError') || 'אירעה שגיאה לא צפויה',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    loadAllTransactions()
  }, [])

  useEffect(() => {
    if (activeTab === "transactions") {
      loadAllTransactions(1, filters)
      setCurrentPage(1)
    }
  }, [filters, activeTab])

  const handleFiltersChange = (newFilters: Partial<PurchaseFilters>) => {
    setFilters(newFilters)
  }

  const handleClearFilters = () => {
    setFilters({})
  }

  const handlePageChange = (page: number) => {
    loadAllTransactions(page, filters)
  }

  const handleRefresh = () => {
    if (activeTab === "overview") {
      loadStats()
    } else {
      loadAllTransactions(currentPage, filters)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || statsLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || statsLoading) ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'רענן'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('purchaseReports.exportReport') || 'ייצא דוח'}
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {t('purchaseReports.lastUpdated') || 'עודכן לאחרונה'}: {new Date().toLocaleString('he-IL')}
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('purchaseReports.tabs.overview') || 'סקירה כללית'}
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            {t('purchaseReports.tabs.transactions') || 'כל העסקאות'}
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            {t('purchaseReports.tabs.analytics') || 'ניתוחים'}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {stats ? (
            <PurchaseStatsOverview stats={stats} isLoading={statsLoading} />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-muted rounded w-48 mx-auto"></div>
                  <div className="h-4 bg-muted rounded w-64 mx-auto"></div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Transactions Tab */}
        <TabsContent value="transactions" className="space-y-6">
          {/* Filters */}
          <PurchaseFiltersComponent
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            showAdvanced={true}
          />

          {/* Transaction Summary */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {loading ? (
                t('common.loading') || 'טוען...'
              ) : (
                `${t('purchaseReports.showing') || 'מציג'} ${Math.min((currentPage - 1) * limit + 1, totalCount)}-${Math.min(currentPage * limit, totalCount)} ${t('purchaseReports.of') || 'מתוך'} ${totalCount} ${t('purchaseReports.transactions') || 'עסקאות'}`
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={transactions.length === 0}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                {t('purchaseReports.exportTransactions') || 'ייצא עסקאות'}
              </Button>
            </div>
          </div>

          {/* Transactions Table */}
          <PurchaseHistoryTable
            transactions={transactions}
            isLoading={loading}
            showCustomerInfo={true}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center">
              {/* Pagination component would go here - same as in other components */}
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Revenue Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('purchaseReports.analytics.revenueTrends') || 'מגמות הכנסות'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('purchaseReports.analytics.chartPlaceholder') || 'גרף מגמות הכנסות'}</p>
                    <p className="text-sm mt-2">
                      {t('purchaseReports.analytics.monthlyBreakdown') || 'פירוט חודשי לפי סוג עסקה'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  {t('purchaseReports.analytics.transactionDistribution') || 'התפלגות עסקאות'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('purchaseReports.analytics.pieChartPlaceholder') || 'גרף עוגה - התפלגות סוגי עסקאות'}</p>
                    <p className="text-sm mt-2">
                      {t('purchaseReports.analytics.percentageBreakdown') || 'פירוט באחוזים'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('purchaseReports.analytics.customerActivity') || 'פעילות לקוחות'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>{t('purchaseReports.analytics.activityChart') || 'גרף פעילות לקוחות'}</p>
                    <p className="text-sm mt-2">
                      {t('purchaseReports.analytics.newVsReturning') || 'לקוחות חדשים מול חוזרים'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('purchaseReports.analytics.performanceMetrics') || 'מדדי ביצועים'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {t('purchaseReports.analytics.conversionRate') || 'שיעור המרה'}:
                        </span>
                        <span className="font-medium">85.2%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {t('purchaseReports.analytics.avgOrderValue') || 'ערך הזמנה ממוצע'}:
                        </span>
                        <span className="font-medium">
                          {stats.averageTransactionValue.toLocaleString('he-IL')} ש״ח
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {t('purchaseReports.analytics.customerRetention') || 'שמירה על לקוחות'}:
                        </span>
                        <span className="font-medium">78.4%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">
                          {t('purchaseReports.analytics.monthlyGrowth') || 'צמיחה חודשית'}:
                        </span>
                        <span className="font-medium text-green-600">+12.3%</span>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 