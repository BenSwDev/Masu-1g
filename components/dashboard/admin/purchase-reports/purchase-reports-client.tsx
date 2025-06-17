"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { useTranslation } from "@/lib/translations/i18n"
import { getPurchaseStats, getAllPurchaseTransactions } from "@/actions/purchase-summary-actions"
import PurchaseStatsOverview from "@/components/common/purchase/purchase-stats-overview"
import PurchaseHistoryTable from "@/components/common/purchase/purchase-history-table"
import PurchaseFiltersComponent from "@/components/common/purchase/purchase-filters"
import type { PurchaseStats, PurchaseTransaction, PurchaseFilters } from "@/lib/types/purchase-summary"
import {
  RefreshCw,
  Download,
  TrendingUp,
  BarChart3,
} from "lucide-react"

export default function PurchaseReportsClient() {
  const { t, dir } = useTranslation()
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
      const result = await getAllPurchaseTransactions(page, limit, newFilters)
      
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
    <div dir={dir} className="space-y-6">
      {/* Page Actions */}
      <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
        <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || statsLoading}
            className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
          >
            <RefreshCw className={`h-4 w-4 ${(loading || statsLoading) ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'רענן'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6" dir={dir}>
        <TabsList className={`grid w-full grid-cols-2 ${dir === 'rtl' ? 'direction-rtl' : ''}`}>
          <TabsTrigger value="overview" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <TrendingUp className="h-4 w-4" />
            {t('purchaseReports.tabs.overview') || 'סקירה כללית'}
          </TabsTrigger>
          <TabsTrigger value="transactions" className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <BarChart3 className="h-4 w-4" />
            {t('purchaseReports.tabs.transactions') || 'כל העסקאות'}
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
          <div className={`flex items-center justify-between ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
            <div className="text-sm text-muted-foreground">
              {loading ? (
                t('common.loading') || 'טוען...'
              ) : (
                `${t('purchaseReports.showing') || 'מציג'} ${Math.min((currentPage - 1) * limit + 1, totalCount)}-${Math.min(currentPage * limit, totalCount)} ${t('purchaseReports.of') || 'מתוך'} ${totalCount} ${t('purchaseReports.transactions') || 'עסקאות'}`
              )}
            </div>

            <div className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}>
              <Button
                variant="outline"
                size="sm"
                disabled={transactions.length === 0}
                className={`flex items-center gap-2 ${dir === 'rtl' ? 'flex-row-reverse' : ''}`}
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
              <div className={`flex items-center space-x-2 ${dir === 'rtl' ? 'space-x-reverse' : ''}`}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  {dir === 'rtl' ? 'הבא' : 'הקודם'}
                </Button>
                
                <span className="text-sm text-muted-foreground">
                  {t('common.page') || 'עמוד'} {currentPage} {t('common.of') || 'מתוך'} {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  {dir === 'rtl' ? 'הקודם' : 'הבא'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
} 
