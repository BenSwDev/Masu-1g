"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import { useToast } from "@/components/common/ui/use-toast"
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
import { Separator } from "@/components/common/ui/separator"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getAllCustomers, getAllPurchaseTransactions } from "@/app/dashboard/(user)/(roles)/admin/customers/actions"
import PurchaseHistoryTable from "@/components/common/purchase/purchase-history-table"
import type { CustomerSummary, PurchaseTransaction } from "@/lib/types/purchase-summary"
import { useTranslation } from "@/lib/translations/i18n"
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
  Activity,
  ShoppingBag,
  Ticket,
  BarChart3,
  Filter,
  SortAsc,
  SortDesc,
  MapPin,
  Clock,
  Star,
  Zap,
  TrendingDown,
  CheckCircle,
  X,
  AlertCircle
} from "lucide-react"
import { useRouter } from "next/navigation"

interface CustomerStats {
  totalCustomers: number
  totalRevenue: number
  averageSpentPerCustomer: number
  activeCustomers: number
  guestCustomers: number
  memberCustomers: number
  topSpenders: CustomerSummary[]
  recentlyActive: CustomerSummary[]
}

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
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'lastActivity' | 'joinDate'>('lastActivity')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null)
  const [customerTransactions, setCustomerTransactions] = useState<PurchaseTransaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [transactionsPage, setTransactionsPage] = useState(1)
  const [transactionsTotalPages, setTransactionsTotalPages] = useState(1)
  const limit = 20

  const loadCustomers = async (page = 1, search = searchQuery, userType = userTypeFilter) => {
    try {
      setLoading(true)
      const result = await getAllCustomers(page, limit, search, userType)
      
      if (result.success && result.data) {
        let sortedCustomers = [...result.data.customers]
        
        // Apply sorting
        sortedCustomers.sort((a, b) => {
          let aValue: any, bValue: any
          
          switch (sortBy) {
            case 'name':
              aValue = a.customerName.toLowerCase()
              bValue = b.customerName.toLowerCase()
              break
            case 'totalSpent':
              aValue = a.totalSpent
              bValue = b.totalSpent
              break
            case 'lastActivity':
              aValue = new Date(a.lastActivity).getTime()
              bValue = new Date(b.lastActivity).getTime()
              break
            case 'joinDate':
              aValue = new Date(a.joinDate).getTime()
              bValue = new Date(b.joinDate).getTime()
              break
            default:
              return 0
          }
          
          if (sortOrder === 'asc') {
            return aValue > bValue ? 1 : -1
          } else {
            return aValue < bValue ? 1 : -1
          }
        })
        
        setCustomers(sortedCustomers)
        setCurrentPage(result.data.currentPage)
        setTotalPages(result.data.totalPages)
        setTotalCount(result.data.totalCount)
      } else {
        toast({
          title: t('customers.error.loadFailed') || 'שגיאה בטעינת הלקוחות',
          description: result.error || t('common.unknownError') || 'אירעה שגיאה לא צפויה',
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

  const loadCustomerTransactions = async (customerId: string, page = transactionsPage) => {
    try {
      setLoadingTransactions(true)
      const result = await getAllPurchaseTransactions(page, 20, { userId: customerId })
      
      if (result.success && result.data) {
        setCustomerTransactions(result.data.transactions)
        setTransactionsTotalPages(result.data.totalPages)
      } else {
        toast({
          title: t('customers.error.transactionsFailed') || 'שגיאה בטעינת עסקאות הלקוח',
          description: result.error || t('common.unknownError') || 'אירעה שגיאה לא צפויה',
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
  }, [searchQuery, userTypeFilter, sortBy, sortOrder])

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

  const handleTransactionsPageChange = (newPage: number) => {
    setTransactionsPage(newPage)
    loadCustomerTransactions(selectedCustomer?.userId || "", newPage)
  }

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null) return '0 ₪'
    const numericAmount = typeof amount === 'number' ? amount : parseFloat(String(amount))
    if (isNaN(numericAmount)) return '0 ₪'
    return `${numericAmount.toLocaleString('he-IL')} ₪`
  }

  const formatDate = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy", { locale: he })
  }

  const formatDateTime = (date: Date) => {
    return format(new Date(date), "dd/MM/yyyy HH:mm", { locale: he })
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

  const getActivityBadge = (customer: CustomerSummary) => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    if (customer.lastActivity >= thirtyDaysAgo) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Zap className="h-3 w-3 mr-1" />
          פעיל
        </Badge>
      )
    }
    
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
    
    if (customer.lastActivity >= ninetyDaysAgo) {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          בינוני
        </Badge>
      )
    }
    
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        <TrendingDown className="h-3 w-3 mr-1" />
        לא פעיל
      </Badge>
    )
  }

  const calculateStats = (): CustomerStats => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0)
    const activeCustomers = customers.filter(c => c.lastActivity >= thirtyDaysAgo)
    const topSpenders = [...customers]
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5)
    const recentlyActive = [...customers]
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime())
      .slice(0, 5)

    return {
      totalCustomers: totalCount,
      totalRevenue,
      averageSpentPerCustomer: customers.length > 0 ? totalRevenue / customers.length : 0,
      activeCustomers: activeCustomers.length,
      guestCustomers: customers.filter(c => c.userType === 'guest').length,
      memberCustomers: customers.filter(c => c.userType === 'member').length,
      topSpenders,
      recentlyActive
    }
  }

  const stats = calculateStats()

  const getSortIcon = (field: typeof sortBy) => {
    if (sortBy !== field) return null
    return sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
  }

  return (
    <div dir={dir} className="space-y-6">
      {/* Enhanced Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              {t('customers.totalCustomers') || 'סה״כ לקוחות'}
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">{stats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-blue-700">
              {stats.memberCustomers} {t('customers.registered') || 'רשומים'} • {stats.guestCustomers} {t('customers.guests') || 'אורחים'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">
              {t('customers.totalRevenue') || 'סה״כ הכנסות'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-green-700">
              {t('customers.fromAllCustomers') || 'מכל הלקוחות במערכת'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">
              {t('customers.averageSpending') || 'ממוצע הוצאה'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">{formatCurrency(stats.averageSpentPerCustomer)}</div>
            <p className="text-xs text-purple-700">
              {t('customers.perCustomer') || 'לכל לקוח במערכת'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">
              {t('customers.activeCustomers') || 'לקוחות פעילים'}
            </CardTitle>
            <Activity className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">{stats.activeCustomers}</div>
            <p className="text-xs text-orange-700">
              {t('customers.activeLast30Days') || 'פעילים ב-30 הימים האחרונים'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('customers.searchPlaceholder') || "חיפוש לקוחות לפי שם, מייל או טלפון..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-9 w-full sm:w-[300px]"
                />
              </div>
              
              <Select value={userTypeFilter} onValueChange={(value: 'all' | 'guests' | 'members') => setUserTypeFilter(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t('customers.filterByType') || "סינון לפי סוג"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('customers.allUsers') || 'כל המשתמשים'}</SelectItem>
                  <SelectItem value="guests">{t('customers.guestsOnly') || 'אורחים בלבד'}</SelectItem>
                  <SelectItem value="members">{t('customers.registeredOnly') || 'משתמשים רשומים'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder={t('customers.sortBy') || "מיין לפי"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lastActivity">{t('customers.lastActivity') || 'פעילות אחרונה'}</SelectItem>
                  <SelectItem value="totalSpent">{t('customers.totalSpent') || 'סה״כ הוצאה'}</SelectItem>
                  <SelectItem value="name">{t('customers.name') || 'שם'}</SelectItem>
                  <SelectItem value="joinDate">{t('customers.joinDate') || 'תאריך הצטרפות'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2 w-full lg:w-auto">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {t('common.refresh') || 'רענן'}
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                {t('common.exportToExcel') || 'ייצא לאקסל'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            רשימת לקוחות
            <Badge variant="secondary" className="mr-2">
              {totalCount.toLocaleString()} לקוחות
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => toggleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      פרטי לקוח
                      {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      פרטי קשר
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => toggleSort('totalSpent')}
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      הוצאה כוללת
                      {getSortIcon('totalSpent')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      פעילות
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/80 transition-colors"
                    onClick={() => toggleSort('lastActivity')}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      פעילות אחרונה
                      {getSortIcon('lastActivity')}
                    </div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      פעולות
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        טוען נתונים...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Users className="h-8 w-8" />
                        <p>לא נמצאו לקוחות התואמים לחיפוש</p>
                        {searchQuery && (
                          <Button variant="outline" size="sm" onClick={() => setSearchQuery("")}>
                            נקה חיפוש
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.userId} className="hover:bg-muted/50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                            <User className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium">{customer.customerName}</div>
                            <div className="flex items-center gap-2 mt-1">
                              {getUserTypeBadge(customer.userType)}
                              {getActivityBadge(customer)}
                            </div>
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
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{customer.customerPhone}</span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-lg font-semibold text-green-600">
                          {formatCurrency(customer.totalSpent)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ממוצע: {formatCurrency(customer.statistics.averageBookingValue)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-xs">
                            <ShoppingBag className="h-3 w-3 mr-1" />
                            {customer.totalBookings} הזמנות
                          </Badge>
                          {customer.activeSubscriptions > 0 && (
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                              <CreditCard className="h-3 w-3 mr-1" />
                              {customer.activeSubscriptions} מנויים
                            </Badge>
                          )}
                          {customer.activeVouchers > 0 && (
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                              <Gift className="h-3 w-3 mr-1" />
                              {customer.activeVouchers} שוברים
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(customer.lastActivity)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          נרשם: {formatDate(customer.joinDate)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCustomerView(customer)}
                          className="flex items-center gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                        >
                          <Eye className="h-4 w-4" />
                          צפה בפרטים
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              הקודם
            </Button>
            
            <div className="flex items-center gap-1">
              {[...Array(Math.min(totalPages, 7))].map((_, index) => {
                let page: number
                if (totalPages <= 7) {
                  page = index + 1
                } else if (currentPage <= 4) {
                  page = index + 1
                } else if (currentPage >= totalPages - 3) {
                  page = totalPages - 6 + index
                } else {
                  page = currentPage - 3 + index
                }
                
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-10"
                  >
                    {page}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              הבא
            </Button>
          </div>
        </div>
      )}

      {/* Enhanced Customer Details Modal */}
      <Dialog open={!!selectedCustomer} onOpenChange={() => setSelectedCustomer(null)}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  פרטי לקוח: {selectedCustomer?.customerName}
                  {selectedCustomer && getUserTypeBadge(selectedCustomer.userType)}
                  {selectedCustomer && getActivityBadge(selectedCustomer)}
                </div>
              </div>
            </DialogTitle>
            <DialogDescription>
              צפה בכל הפעילות, העסקאות והסטטיסטיקות המפורטות של הלקוח
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="flex-1 overflow-hidden">
                             <Tabs defaultValue="personal" className="h-full flex flex-col">
                 <TabsList className="grid w-full grid-cols-5">
                   <TabsTrigger value="personal" className="flex items-center gap-2">
                     <User className="h-4 w-4" />
                     {t('customers.tabs.personal') || 'מידע אישי'}
                   </TabsTrigger>
                   <TabsTrigger value="financial" className="flex items-center gap-2">
                     <DollarSign className="h-4 w-4" />
                     {t('customers.tabs.financial') || 'סיכום כספי'}
                   </TabsTrigger>
                   <TabsTrigger value="active" className="flex items-center gap-2">
                     <Gift className="h-4 w-4" />
                     {t('customers.tabs.active') || 'פריטים פעילים'}
                   </TabsTrigger>
                   <TabsTrigger value="transactions" className="flex items-center gap-2">
                     <CreditCard className="h-4 w-4" />
                     {t('customers.tabs.transactions') || 'עסקאות'}
                   </TabsTrigger>
                   <TabsTrigger value="activity" className="flex items-center gap-2">
                     <Activity className="h-4 w-4" />
                     {t('customers.tabs.activity') || 'פעילות'}
                   </TabsTrigger>
                 </TabsList>

                                 <div className="flex-1 overflow-hidden mt-4">
                   {/* Personal Information Tab */}
                   <TabsContent value="personal" className="h-full overflow-y-auto">
                     <Card className="border-blue-200 bg-blue-50/50">
                       <CardHeader>
                         <CardTitle className="text-lg flex items-center gap-2">
                           <User className="h-5 w-5" />
                           {t('customers.personalInfo') || 'מידע אישי'}
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-4">
                             <div>
                               <p className="text-sm font-medium text-muted-foreground">{t('customers.name') || 'שם מלא'}</p>
                               <p className="text-lg font-semibold">{selectedCustomer.customerName}</p>
                             </div>
                             <Separator />
                             <div>
                               <p className="text-sm font-medium text-muted-foreground">{t('customers.email') || 'כתובת מייל'}</p>
                               <p className="font-medium">{selectedCustomer.customerEmail}</p>
                             </div>
                             {selectedCustomer.customerPhone && (
                               <>
                                 <Separator />
                                 <div>
                                   <p className="text-sm font-medium text-muted-foreground">{t('customers.phone') || 'מספר טלפון'}</p>
                                   <p className="font-medium">{selectedCustomer.customerPhone}</p>
                                 </div>
                               </>
                             )}
                           </div>
                           <div className="space-y-4">
                             <div>
                               <p className="text-sm font-medium text-muted-foreground">{t('customers.joinDate') || 'תאריך הצטרפות'}</p>
                               <p className="font-medium">{formatDate(selectedCustomer.joinDate)}</p>
                             </div>
                             <Separator />
                             <div>
                               <p className="text-sm font-medium text-muted-foreground">{t('customers.accountType') || 'סוג חשבון'}</p>
                               <div className="mt-1">
                                 {getUserTypeBadge(selectedCustomer.userType)}
                               </div>
                             </div>
                             <Separator />
                             <div>
                               <p className="text-sm font-medium text-muted-foreground">{t('customers.lastActivity') || 'פעילות אחרונה'}</p>
                               <p className="font-medium">{formatDateTime(selectedCustomer.lastActivity)}</p>
                             </div>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   </TabsContent>

                   {/* Financial Summary Tab */}
                   <TabsContent value="financial" className="h-full overflow-y-auto">
                     <Card className="border-green-200 bg-green-50/50">
                       <CardHeader>
                         <CardTitle className="text-lg flex items-center gap-2">
                           <DollarSign className="h-5 w-5" />
                           {t('customers.financialSummary') || 'סיכום כספי'}
                         </CardTitle>
                       </CardHeader>
                       <CardContent>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                           <div className="text-center p-6 bg-white rounded-lg border">
                             <div className="text-3xl font-bold text-green-600 mb-2">
                               {formatCurrency(selectedCustomer.totalSpent)}
                             </div>
                             <div className="text-sm text-muted-foreground">{t('customers.totalSpent') || 'סה״כ הוצאה'}</div>
                           </div>
                           <div className="text-center p-6 bg-white rounded-lg border">
                             <div className="text-2xl font-bold text-blue-600 mb-2">
                               {formatCurrency(selectedCustomer.statistics.averageBookingValue)}
                             </div>
                             <div className="text-sm text-muted-foreground">{t('customers.averageBookingValue') || 'ממוצע להזמנה'}</div>
                           </div>
                           <div className="text-center p-6 bg-white rounded-lg border">
                             <div className="text-2xl font-bold text-purple-600 mb-2">
                               {selectedCustomer.totalBookings}
                             </div>
                             <div className="text-sm text-muted-foreground">{t('customers.totalBookings') || 'סה״כ הזמנות'}</div>
                           </div>
                         </div>
                         <Separator className="my-6" />
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="text-center p-4 bg-green-50 rounded-lg border">
                             <div className="text-xl font-bold text-green-600">
                               {selectedCustomer.statistics.completedBookings}
                             </div>
                             <div className="text-sm text-muted-foreground">{t('customers.completedBookings') || 'הזמנות הושלמו'}</div>
                           </div>
                           <div className="text-center p-4 bg-red-50 rounded-lg border">
                             <div className="text-xl font-bold text-red-600">
                               {selectedCustomer.statistics.cancelledBookings}
                             </div>
                             <div className="text-sm text-muted-foreground">{t('customers.cancelledBookings') || 'הזמנות בוטלו'}</div>
                           </div>
                           <div className="text-center p-4 bg-orange-50 rounded-lg border">
                             <div className="text-xl font-bold text-orange-600">
                               {selectedCustomer.statistics.noShowBookings}
                             </div>
                             <div className="text-sm text-muted-foreground">{t('customers.noShowBookings') || 'לא הגיעו'}</div>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   </TabsContent>

                   {/* Active Items Tab */}
                   <TabsContent value="active" className="h-full overflow-y-auto">
                     <Card className="border-purple-200 bg-purple-50/50">
                       <CardHeader>
                         <CardTitle className="text-lg flex items-center gap-2">
                           <Gift className="h-5 w-5" />
                           {t('customers.activeItems') || 'פריטים פעילים'}
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                             <div className="flex items-center gap-3">
                               <div className="p-2 bg-blue-100 rounded-lg">
                                 <CreditCard className="h-5 w-5 text-blue-600" />
                               </div>
                               <div>
                                 <p className="font-medium">{t('customers.activeSubscriptions') || 'מנויים פעילים'}</p>
                                 <p className="text-sm text-muted-foreground">{t('customers.subscriptionsDesc') || 'מנויים בתוקף'}</p>
                               </div>
                             </div>
                             <Badge variant="outline" className="bg-blue-50 text-blue-700 text-lg px-3 py-1">
                               {selectedCustomer.activeSubscriptions}
                             </Badge>
                           </div>
                           
                           <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                             <div className="flex items-center gap-3">
                               <div className="p-2 bg-purple-100 rounded-lg">
                                 <Gift className="h-5 w-5 text-purple-600" />
                               </div>
                               <div>
                                 <p className="font-medium">{t('customers.activeVouchers') || 'שוברי מתנה פעילים'}</p>
                                 <p className="text-sm text-muted-foreground">{t('customers.vouchersDesc') || 'שוברים בתוקף'}</p>
                               </div>
                             </div>
                             <Badge variant="outline" className="bg-purple-50 text-purple-700 text-lg px-3 py-1">
                               {selectedCustomer.activeVouchers}
                             </Badge>
                           </div>
                           
                           <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
                             <div className="flex items-center gap-3">
                               <div className="p-2 bg-green-100 rounded-lg">
                                 <ShoppingBag className="h-5 w-5 text-green-600" />
                               </div>
                               <div>
                                 <p className="font-medium">{t('customers.totalBookings') || 'סה״כ הזמנות'}</p>
                                 <p className="text-sm text-muted-foreground">{t('customers.bookingsDesc') || 'כל ההזמנות'}</p>
                               </div>
                             </div>
                             <Badge variant="outline" className="bg-green-50 text-green-700 text-lg px-3 py-1">
                               {selectedCustomer.totalBookings}
                             </Badge>
                           </div>
                         </div>
                         
                         <Separator className="my-6" />
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div className="p-4 bg-white rounded-lg border">
                             <h4 className="font-semibold mb-2 flex items-center gap-2">
                               <Ticket className="h-4 w-4" />
                               {t('customers.subscriptionsPurchased') || 'מנויים שנרכשו'}
                             </h4>
                             <div className="text-2xl font-bold text-blue-600">
                               {selectedCustomer.statistics.totalSubscriptionsPurchased}
                             </div>
                           </div>
                           
                           <div className="p-4 bg-white rounded-lg border">
                             <h4 className="font-semibold mb-2 flex items-center gap-2">
                               <Gift className="h-4 w-4" />
                               {t('customers.vouchersPurchased') || 'שוברים שנרכשו'}
                             </h4>
                             <div className="text-2xl font-bold text-purple-600">
                               {selectedCustomer.statistics.totalVouchersPurchased}
                             </div>
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   </TabsContent>

                  {/* Transactions Tab */}
                  <TabsContent value="transactions" className="h-full overflow-y-auto">
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            {t('customers.transactionHistory') || 'היסטוריית עסקאות'}
                          </CardTitle>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => loadCustomerTransactions(selectedCustomer.customerEmail)}
                            disabled={loadingTransactions}
                          >
                            <RefreshCw className={`h-4 w-4 mr-2 ${loadingTransactions ? 'animate-spin' : ''}`} />
                            {t('common.refresh') || 'רענן'}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {loadingTransactions ? (
                          <div className="flex justify-center py-8">
                            <RefreshCw className="h-6 w-6 animate-spin" />
                          </div>
                        ) : customerTransactions.length > 0 ? (
                          <div className="space-y-4">
                            <PurchaseHistoryTable
                              transactions={customerTransactions}
                              showCustomerInfo={false}
                            />
                            
                            {transactionsTotalPages > 1 && (
                              <Pagination>
                                <PaginationContent>
                                  <PaginationPrevious 
                                    onClick={() => handleTransactionsPageChange(transactionsPage - 1)}
                                    className={transactionsPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                                  />
                                  {Array.from({ length: transactionsTotalPages }, (_, i) => i + 1).map((page) => (
                                    <PaginationItem key={page}>
                                      <PaginationLink
                                        onClick={() => handleTransactionsPageChange(page)}
                                        isActive={page === transactionsPage}
                                      >
                                        {page}
                                      </PaginationLink>
                                    </PaginationItem>
                                  ))}
                                  <PaginationNext 
                                    onClick={() => handleTransactionsPageChange(transactionsPage + 1)}
                                    className={transactionsPage >= transactionsTotalPages ? 'pointer-events-none opacity-50' : ''}
                                  />
                                </PaginationContent>
                              </Pagination>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>{t('customers.noTransactions') || 'לא נמצאו עסקאות עבור לקוח זה'}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Activity Tab */}
                  <TabsContent value="activity" className="h-full overflow-y-auto">
                    <Card className="border-orange-200 bg-orange-50/50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          {t('customers.activityStats') || 'סטטיסטיקות פעילות מפורטות'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <div className="text-center p-6 bg-white rounded-lg border">
                            <div className="p-3 bg-green-100 rounded-lg mx-auto w-fit mb-3">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="text-2xl font-bold text-green-600 mb-1">
                              {selectedCustomer.statistics.completedBookings}
                            </div>
                            <div className="text-sm text-muted-foreground">{t('customers.completedBookings') || 'הזמנות הושלמו'}</div>
                          </div>
                          
                          <div className="text-center p-6 bg-white rounded-lg border">
                            <div className="p-3 bg-red-100 rounded-lg mx-auto w-fit mb-3">
                              <X className="h-6 w-6 text-red-600" />
                            </div>
                            <div className="text-2xl font-bold text-red-600 mb-1">
                              {selectedCustomer.statistics.cancelledBookings}
                            </div>
                            <div className="text-sm text-muted-foreground">{t('customers.cancelledBookings') || 'הזמנות בוטלו'}</div>
                          </div>
                          
                          <div className="text-center p-6 bg-white rounded-lg border">
                            <div className="p-3 bg-orange-100 rounded-lg mx-auto w-fit mb-3">
                              <AlertCircle className="h-6 w-6 text-orange-600" />
                            </div>
                            <div className="text-2xl font-bold text-orange-600 mb-1">
                              {selectedCustomer.statistics.noShowBookings}
                            </div>
                            <div className="text-sm text-muted-foreground">{t('customers.noShowBookings') || 'לא הגיעו'}</div>
                          </div>
                          
                          <div className="text-center p-6 bg-white rounded-lg border">
                            <div className="p-3 bg-blue-100 rounded-lg mx-auto w-fit mb-3">
                              <Ticket className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                              {selectedCustomer.statistics.totalSubscriptionsPurchased}
                            </div>
                            <div className="text-sm text-muted-foreground">{t('customers.subscriptionsPurchased') || 'מנויים נרכשו'}</div>
                          </div>
                        </div>
                        
                        <Separator className="my-6" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="p-6 bg-white rounded-lg border">
                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                              <BarChart3 className="h-5 w-5 text-blue-600" />
                              {t('customers.successRate') || 'שיעור הצלחה'}
                            </h4>
                            <div className="text-center">
                              <div className="text-3xl font-bold text-blue-600 mb-2">
                                {selectedCustomer.totalBookings > 0 
                                  ? Math.round((selectedCustomer.statistics.completedBookings / selectedCustomer.totalBookings) * 100)
                                  : 0}%
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {t('customers.outOf') || 'מתוך'} {selectedCustomer.totalBookings} {t('customers.bookings') || 'הזמנות'}
                              </div>
                            </div>
                          </div>
                          
                          <div className="p-6 bg-white rounded-lg border">
                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                              <TrendingUp className="h-5 w-5 text-green-600" />
                              {t('customers.customerRating') || 'דירוג לקוח'}
                            </h4>
                            <div className="text-center">
                              {selectedCustomer.totalSpent > 1000 ? (
                                <>
                                  <div className="text-2xl mb-2">⭐</div>
                                  <div className="font-semibold text-yellow-600">{t('customers.vipCustomer') || 'לקוח VIP'}</div>
                                </>
                              ) : selectedCustomer.totalSpent > 500 ? (
                                <>
                                  <div className="text-2xl mb-2">💎</div>
                                  <div className="font-semibold text-blue-600">{t('customers.preferredCustomer') || 'לקוח מועדף'}</div>
                                </>
                              ) : (
                                <>
                                  <div className="text-2xl mb-2">👤</div>
                                  <div className="font-semibold text-gray-600">{t('customers.regularCustomer') || 'לקוח רגיל'}</div>
                                </>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-6 bg-white rounded-lg border">
                            <h4 className="font-semibold mb-4 flex items-center gap-2">
                              <Clock className="h-5 w-5 text-purple-600" />
                              {t('customers.activityLevel') || 'רמת פעילות'}
                            </h4>
                            <div className="text-center">
                              {getActivityBadge(selectedCustomer)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>


                </div>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
} 