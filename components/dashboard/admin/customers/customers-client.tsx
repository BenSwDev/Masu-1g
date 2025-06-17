"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/common/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/common/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/common/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/common/ui/select"
import { Badge } from "@/components/common/ui/badge"
import { useTranslation } from "@/lib/translations/i18n"
import { getAllCustomers, getUserPurchaseHistory } from "@/actions/purchase-summary-actions"
import PurchaseHistoryTable from "@/components/common/purchase/purchase-history-table"
import type { CustomerSummary, PurchaseTransaction } from "@/lib/types/purchase-summary"
import {
  Search,
  Users,
  TrendingUp,
  Calendar,
  CreditCard,
  Gift,
  Eye,
  RefreshCw,
  Download,
  User,
  Phone,
  Mail,
  DollarSign,
  UserCheck,
  UserX,
} from "lucide-react"

export default function CustomersClient() {
  const { t, dir } = useTranslation()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState<CustomerSummary[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [userTypeFilter, setUserTypeFilter] = useState<'all' | 'guests' | 'members'>('all')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [customerTransactions, setCustomerTransactions] = useState<PurchaseTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const limit = 20

  const loadCustomers = async (page = 1, search = searchQuery, userType = userTypeFilter) => {
    try {
      setLoading(true)
      const result = await getAllCustomers(page, limit, search, userType)
      
      if (result.success && result.data) {
        setCustomers(result.data.customers)
        setCurrentPage(result.data.currentPage)
        setTotalPages(result.data.totalPages)
        setTotalCount(result.data.totalCount)
      } else {
        toast({
          title: t('customers.error.loadFailed') || 'שגיאה בטעינת הלקוחות',
          description: result.error || t('common.unknownError'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading customers:', error)
      toast({
        title: t('customers.error.loadFailed') || 'שגיאה בטעינת הלקוחות',
        description: t('common.unknownError') || 'אירעה שגיאה לא צפויה',
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerTransactions = async (customerId: string) => {
    try {
      setLoadingTransactions(true)
      const result = await getUserPurchaseHistory(1, 50, { userId: customerId })
      
      if (result.success && result.data) {
        setCustomerTransactions(result.data.transactions)
      } else {
        toast({
          title: t('customers.error.transactionsFailed') || 'שגיאה בטעינת עסקאות הלקוח',
          description: result.error || t('common.unknownError'),
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading customer transactions:', error)
      toast({
        title: t('customers.error.transactionsFailed') || 'שגיאה בטעינת עסקאות הלקוח',
        description: t('common.unknownError') || 'אירעה שגיאה לא צפויה',
        variant: "destructive",
      })
    } finally {
      setLoadingTransactions(false)
    }
  }

  useEffect(() => {
    loadCustomers(1, searchQuery, userTypeFilter)
    setCurrentPage(1)
  }, [searchQuery, userTypeFilter])

  useEffect(() => {
    loadCustomers()
  }, [])

  const handlePageChange = (page: number) => {
    loadCustomers(page, searchQuery, userTypeFilter)
  }

  const handleRefresh = () => {
    loadCustomers(currentPage, searchQuery, userTypeFilter)
  }

  const handleCustomerView = async (customer: CustomerSummary) => {
    setSelectedCustomer(customer)
    await loadCustomerTransactions(customer.userId)
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0 ש״ח'
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount))
    if (isNaN(numericAmount)) return '0 ש״ח'
    return `${numericAmount.toLocaleString('he-IL')} ש״ח`
  }

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: he })
  }

  const getUserTypeBadge = (userType?: 'guest' | 'member') => {
    if (userType === 'guest') {
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <UserX className="h-3 w-3 mr-1" />
          אורח
        </Badge>
      )
    }
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <UserCheck className="h-3 w-3 mr-1" />
        רשום
      </Badge>
    )
  }

  // Calculate summary stats
  const summaryStats = {
    totalCustomers: totalCount,
    totalRevenue: customers.reduce((sum, c) => sum + c.totalSpent, 0),
    averageSpentPerCustomer: customers.length > 0 ? customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length : 0,
    activeCustomers: customers.filter(c => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      return c.lastActivity >= thirtyDaysAgo
    }).length,
    guestCustomers: customers.filter(c => c.userType === 'guest').length,
    memberCustomers: customers.filter(c => c.userType === 'member').length,
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('customers.summary.totalCustomers') || 'סה״כ לקוחות'}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {summaryStats.memberCustomers} רשומים, {summaryStats.guestCustomers} אורחים
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('customers.summary.totalRevenue') || 'סה״כ הכנסות'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {t('customers.summary.fromAllCustomers') || 'מכל הלקוחות'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('customers.summary.averageSpent') || 'ממוצע הוצאה'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summaryStats.averageSpentPerCustomer)}</div>
            <p className="text-xs text-muted-foreground">
              {t('customers.summary.perCustomer') || 'לכל לקוח'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('customers.summary.activeCustomers') || 'לקוחות פעילים'}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.activeCustomers}</div>
            <p className="text-xs text-muted-foreground">
              {t('customers.summary.last30Days') || 'ב-30 יום האחרונים'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('customers.searchPlaceholder') || 'חפש לקוח לפי שם, אימייל או טלפון...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={userTypeFilter} onValueChange={(value: 'all' | 'guests' | 'members') => setUserTypeFilter(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הלקוחות</SelectItem>
              <SelectItem value="members">רשומים</SelectItem>
              <SelectItem value="guests">אורחים</SelectItem>
            </SelectContent>
          </Select>

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
            disabled={customers.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {t('customers.export') || 'ייצא נתונים'}
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="text-sm text-muted-foreground">
        {loading ? (
          t('common.loading') || 'טוען...'
        ) : (
          `${t('customers.showing') || 'מציג'} ${Math.min((currentPage - 1) * limit + 1, totalCount)}-${Math.min(currentPage * limit, totalCount)} ${t('customers.of') || 'מתוך'} ${totalCount} ${t('customers.results') || 'לקוחות'}`
        )}
      </div>

      {/* Customers Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('customers.table.customer') || 'לקוח'}</TableHead>
                <TableHead>{t('customers.table.contact') || 'פרטי קשר'}</TableHead>
                <TableHead>{t('customers.table.joinDate') || 'תאריך הצטרפות'}</TableHead>
                <TableHead>{t('customers.table.lastActivity') || 'פעילות אחרונה'}</TableHead>
                <TableHead>{t('customers.table.totalSpent') || 'סה״כ הוצאה'}</TableHead>
                <TableHead>{t('customers.table.activeItems') || 'פריטים פעילים'}</TableHead>
                <TableHead>{t('customers.table.actions') || 'פעולות'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 7 }).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <div className="h-4 bg-muted animate-pulse rounded"></div>
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <Users className="h-8 w-8 text-muted-foreground" />
                      <p className="text-muted-foreground">
                        {searchQuery 
                          ? (t('customers.noSearchResults') || 'לא נמצאו לקוחות התואמים לחיפוש')
                          : (t('customers.noCustomers') || 'אין לקוחות רשומים במערכת')
                        }
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.userId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{customer.customerName}</p>
                            {getUserTypeBadge(customer.userType)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ID: {customer.userId.slice(-8)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span>{customer.customerEmail}</span>
                        </div>
                        {customer.customerPhone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="h-3 w-3 text-muted-foreground" />
                            <span>{customer.customerPhone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(customer.joinDate)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{formatDate(customer.lastActivity)}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(customer.totalSpent)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {customer.totalBookings} {t('customers.bookings') || 'הזמנות'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {customer.activeSubscriptions > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {customer.activeSubscriptions} {t('customers.subscriptions') || 'מנויים'}
                          </Badge>
                        )}
                        {customer.activeVouchers > 0 && (
                          <Badge variant="outline" className="text-xs">
                            {customer.activeVouchers} {t('customers.vouchers') || 'שוברים'}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCustomerView(customer)}
                        className="flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        {t('customers.viewDetails') || 'צפה בפרטים'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

      {/* Customer Details Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('customers.customerDetails') || 'פרטי לקוח'} - {selectedCustomer?.customerName}
              {selectedCustomer && getUserTypeBadge(selectedCustomer.userType)}
            </DialogTitle>
            <DialogDescription>
              {t('customers.customerDetailsDesc') || 'צפה בכל הפעילות והעסקאות של הלקוח'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('customers.personalInfo') || 'מידע אישי'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.name') || 'שם'}:</p>
                      <p className="font-medium">{selectedCustomer.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.email') || 'אימייל'}:</p>
                      <p className="font-medium">{selectedCustomer.customerEmail}</p>
                    </div>
                    {selectedCustomer.customerPhone && (
                      <div>
                        <p className="text-sm text-muted-foreground">{t('customers.phone') || 'טלפון'}:</p>
                        <p className="font-medium">{selectedCustomer.customerPhone}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.joinDate') || 'תאריך הצטרפות'}:</p>
                      <p className="font-medium">{formatDate(selectedCustomer.joinDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">סוג משתמש:</p>
                      {getUserTypeBadge(selectedCustomer.userType)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('customers.statistics') || 'סטטיסטיקות'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.totalSpent') || 'סה״כ הוצאה'}:</p>
                      <p className="font-medium text-lg">{formatCurrency(selectedCustomer.totalSpent)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.completedBookings') || 'הזמנות שהושלמו'}:</p>
                      <p className="font-medium">{selectedCustomer.statistics.completedBookings}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.averageBookingValue') || 'ערך ממוצע להזמנה'}:</p>
                      <p className="font-medium">{formatCurrency(selectedCustomer.statistics.averageBookingValue)}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('customers.activeItems') || 'פריטים פעילים'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.activeSubscriptions') || 'מנויים פעילים'}:</p>
                      <p className="font-medium">{selectedCustomer.activeSubscriptions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.activeVouchers') || 'שוברים פעילים'}:</p>
                      <p className="font-medium">{selectedCustomer.activeVouchers}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{t('customers.lastActivity') || 'פעילות אחרונה'}:</p>
                      <p className="font-medium">{formatDate(selectedCustomer.lastActivity)}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Customer Transactions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {t('customers.transactionHistory') || 'היסטוריית עסקאות'}
                </h3>
                <PurchaseHistoryTable
                  transactions={customerTransactions}
                  isLoading={loadingTransactions}
                  showCustomerInfo={false}
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 
