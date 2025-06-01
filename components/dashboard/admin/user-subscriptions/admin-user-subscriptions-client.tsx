"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Search, Filter, Download, RefreshCw, Users, TrendingUp, Calendar, CreditCard } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { useState, useEffect } from "react"
import UserSubscriptionRow from "./user-subscription-row"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { User } from "next-auth"
import { getAllUserSubscriptions } from "@/actions/user-subscription-actions"
import { toast } from "sonner"
import { Skeleton } from "@/components/common/ui/skeleton"

interface PopulatedUserSubscription extends IUserSubscription {
  userId: Pick<User, "name" | "email"> & { _id: string }
  subscriptionId: ISubscription
  treatmentId: ITreatment
  selectedDurationDetails?: ITreatmentDuration
  paymentMethodId: { _id: string; cardName?: string; cardNumber: string }
}

interface AdminUserSubscriptionsClientProps {
  initialUserSubscriptions?: PopulatedUserSubscription[]
  initialPagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const AdminUserSubscriptionsClient = ({
  initialUserSubscriptions = [],
  initialPagination,
}: AdminUserSubscriptionsClientProps) => {
  const { t } = useTranslation()

  // State management
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(initialPagination?.page || 1)
  const [limit, setLimit] = useState(initialPagination?.limit || 10)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [userSubscriptions, setUserSubscriptions] = useState<PopulatedUserSubscription[]>(initialUserSubscriptions)
  const [pagination, setPagination] = useState(initialPagination)

  // Statistics calculation
  const stats = {
    total: pagination?.total || 0,
    active: userSubscriptions.filter((sub) => sub.status === "active").length,
    expired: userSubscriptions.filter((sub) => sub.status === "expired").length,
    revenue: userSubscriptions.reduce((sum, sub) => sum + (sub.paymentAmount || 0), 0),
  }

  const fetchData = async (
    page: number,
    currentLimit: number,
    search: string,
    status: string,
    showRefreshToast = false,
  ) => {
    setIsLoading(true)
    if (showRefreshToast) setIsRefreshing(true)

    try {
      const result = await getAllUserSubscriptions({
        page,
        limit: currentLimit,
        search: search || undefined,
        status: status === "all" ? undefined : status,
      })

      if (result.success && result.userSubscriptions && result.pagination) {
        setUserSubscriptions(result.userSubscriptions as PopulatedUserSubscription[])
        setPagination(result.pagination)
        if (showRefreshToast) {
          toast.success("הנתונים עודכנו בהצלחה")
        }
      } else {
        toast.error(result.error || "שגיאה בטעינת הנתונים")
      }
    } catch (error) {
      toast.error("שגיאה בטעינת הנתונים")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (
      initialUserSubscriptions.length > 0 &&
      currentPage === initialPagination?.page &&
      searchTerm === "" &&
      statusFilter === "all" &&
      limit === initialPagination?.limit
    ) {
      return
    }
    fetchData(currentPage, limit, searchTerm, statusFilter)
  }, [currentPage, limit])

  const handleSearchAndFilter = () => {
    setCurrentPage(1)
    fetchData(1, limit, searchTerm, statusFilter)
  }

  const handleRefresh = () => {
    fetchData(currentPage, limit, searchTerm, statusFilter, true)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination?.totalPages || 1)) {
      setCurrentPage(newPage)
    }
  }

  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info("פונקציית ייצוא תתווסף בקרוב")
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "expired":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "depleted":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "cancelled":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const TableSkeleton = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                {Array(8)
                  .fill(0)
                  .map((_, i) => (
                    <th key={i} className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      <Skeleton className="h-4 w-20 float-right" />
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {Array(limit)
                .fill(0)
                .map((_, i) => (
                  <tr key={i} className="border-b hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    {Array(8)
                      .fill(0)
                      .map((_, j) => (
                        <td key={j} className="py-4 px-4">
                          <Skeleton className="h-4 w-full" />
                          {j === 0 && <Skeleton className="h-3 w-3/4 mt-1" />}
                        </td>
                      ))}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">מנויי משתמשים</h1>
          <p className="text-gray-600 dark:text-gray-300">ניהול וצפייה במנויים של כל המשתמשים במערכת</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            רענן
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            ייצא
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">סה"כ מנויים</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">מנויים פעילים</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">מנויים שפגו</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <Calendar className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">סה"כ הכנסות</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">₪{stats.revenue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="relative md:col-span-2">
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                חיפוש
              </label>
              <Search className="absolute rtl:right-2.5 ltr:left-2.5 top-9 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                id="search-input"
                placeholder="חפש לפי שם משתמש, אימייל או שם מנוי..."
                className="rtl:pr-8 ltr:pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearchAndFilter()}
              />
            </div>
            <div className="w-full">
              <label
                htmlFor="status-filter"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                סינון לפי סטטוס
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="active">פעיל</SelectItem>
                  <SelectItem value="expired">פג תוקף</SelectItem>
                  <SelectItem value="depleted">מוצה</SelectItem>
                  <SelectItem value="cancelled">מבוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-2">
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <Filter className="h-3 w-3" />
                  סטטוס:{" "}
                  {statusFilter === "active"
                    ? "פעיל"
                    : statusFilter === "expired"
                      ? "פג תוקף"
                      : statusFilter === "depleted"
                        ? "מוצה"
                        : "מבוטל"}
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  <Search className="h-3 w-3" />
                  חיפוש: {searchTerm}
                </Badge>
              )}
            </div>
            <Button onClick={handleSearchAndFilter} disabled={isLoading}>
              {isLoading ? "מחפש..." : "החל מסננים"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {isLoading ? (
        <TableSkeleton />
      ) : userSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">אין מנויים להצגה</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== "all"
                  ? "לא נמצאו מנויים התואמים לקריטריונים שנבחרו"
                  : "עדיין לא נרכשו מנויים במערכת"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">משתמש</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">פרטי מנוי</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">פרטי טיפול</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">כמות וניצול</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">תאריכים</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">תשלום</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">סטטוס</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {userSubscriptions.map((subscription) => (
                    <UserSubscriptionRow
                      key={String(subscription._id)}
                      userSubscription={subscription}
                      onSubscriptionUpdate={() => fetchData(currentPage, limit, searchTerm, statusFilter)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            עמוד {pagination.page} מתוך {pagination.totalPages} ({pagination.total} תוצאות)
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoading}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              הקודם
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Select
              value={limit.toString()}
              onValueChange={(value) => {
                setLimit(Number.parseInt(value))
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((l) => (
                  <SelectItem key={l} value={l.toString()}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === pagination.totalPages || isLoading}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              הבא
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUserSubscriptionsClient
