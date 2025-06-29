"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Search, Filter, Download, RefreshCw, Users, TrendingUp, CalendarIcon, CreditCard, List, Plus } from "lucide-react" // Renamed Calendar to CalendarIcon
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button" // Corrected path
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import UserSubscriptionRow from "./user-subscription-row"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { User } from "next-auth"
import { getAllUserSubscriptions, updateUserSubscription, createUserSubscription } from "@/app/dashboard/(user)/(roles)/admin/user-subscriptions/actions"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { useIsMobile } from "@/components/ui/use-mobile" // Corrected import
import UserSubscriptionAdminCard from "./user-subscription-admin-card"
import UserSubscriptionAdminCardSkeleton from "./user-subscription-admin-card-skeleton"
import UserSubscriptionForm from "./user-subscription-form"
import CreateUserSubscriptionForm from "./create-user-subscription-form"
import { useRouter } from "next/navigation"

interface PopulatedUserSubscription extends Omit<IUserSubscription, 'userId' | 'subscriptionId' | 'treatmentId' | 'paymentMethodId'> {
  userId?: {
    _id: string
    name: string
    email?: string // Make email optional
  } | null
  subscriptionId: {
    _id: string
    name: string
    description?: string
    price: number
    duration: number
    treatments: string[]
    isActive: boolean
  }
  treatmentId: {
    _id: string
    name: string
    price: number
    durations: Array<{
      _id: string
      minutes: number
      price: number
    }>
  }
  paymentMethodId?: {
    _id: string
    cardName: string
    cardNumber: string
  } | null
  guestInfo?: {
    name: string
    email?: string // Make email optional to match the new system
    phone: string
  }
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
  const isMobile = useIsMobile()
  const router = useRouter()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(initialPagination?.page || 1)
  const [limit, setLimit] = useState(initialPagination?.limit || 10)
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<PopulatedUserSubscription | null>(null)

  const [userSubscriptions, setUserSubscriptions] = useState<PopulatedUserSubscription[]>(initialUserSubscriptions)
  const [pagination, setPagination] = useState(initialPagination)

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
          toast.success(t("userSubscriptions.notifications.dataRefreshed"))
        }
      } else {
        toast.error(result.error || t("userSubscriptions.notifications.dataLoadError"))
      }
    } catch (error) {
      toast.error(t("userSubscriptions.notifications.dataLoadError"))
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
      // Initial data is already loaded, no need to fetch again unless parameters change
      return
    }
    fetchData(currentPage, limit, searchTerm, statusFilter)
  }, [currentPage, limit]) // Removed initialUserSubscriptions, initialPagination, searchTerm, statusFilter from deps to avoid re-fetch on initial load if data is present

  const handleSearchAndFilter = () => {
    setCurrentPage(1) // Reset to first page on new search/filter
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
    toast.info(t("common.featureComingSoon"))
  }

  const handleEdit = (sub: PopulatedUserSubscription) => {
    setCurrentSubscription(sub)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (data: FormData) => {
    if (!currentSubscription) return
    
    const result = await updateUserSubscription(String(currentSubscription._id), data)
    
    if (result.success) {
      toast.success(t("userSubscriptions.updateSuccessToast"))
      setCurrentSubscription(null)
      await fetchData(currentPage, limit, searchTerm, statusFilter)
    } else {
      toast.error(result.error || t("common.unknownError"))
    }
  }

  const handleCreate = async (data: FormData) => {
    const result = await createUserSubscription(data)
    
    if (result.success) {
      toast.success(t("userSubscriptions.createSuccessToast"))
      setIsCreateDialogOpen(false)
      await fetchData(currentPage, limit, searchTerm, statusFilter)
    } else {
      toast.error(result.error || t("common.unknownError"))
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

  const CardListSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array(limit)
        .fill(0)
        .map((_, i) => (
          <UserSubscriptionAdminCardSkeleton key={i} />
        ))}
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t("userSubscriptions.pageTitle")}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t("userSubscriptions.pageDescription")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t("userSubscriptions.createNew")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("common.refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            {t("common.export")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("userSubscriptions.stats.total")}
                </p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("userSubscriptions.stats.active")}
                </p>
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
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("userSubscriptions.stats.expired")}
                </p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.expired}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <CalendarIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {t("userSubscriptions.stats.revenue")}
                </p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">₪{stats.revenue.toFixed(2)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="relative md:col-span-2">
              <label htmlFor="search-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t("common.search")}
              </label>
              <Search className="absolute rtl:right-2.5 ltr:left-2.5 top-9 h-4 w-4 text-gray-500 dark:text-gray-400" />
              <Input
                id="search-input"
                placeholder={t("userSubscriptions.searchPlaceholder")}
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
                {t("userSubscriptions.filterByStatus")}
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status-filter">
                  <SelectValue placeholder={t("userSubscriptions.selectStatusPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("subscriptions.status.all")}</SelectItem>
                  <SelectItem value="active">{t("subscriptions.status.active")}</SelectItem>
                  <SelectItem value="expired">{t("subscriptions.status.expired")}</SelectItem>
                  <SelectItem value="depleted">{t("subscriptions.status.depleted")}</SelectItem>
                  <SelectItem value="cancelled">{t("subscriptions.status.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <div className="flex gap-2 flex-wrap">
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  <Filter className="h-3 w-3" />
                  {t("common.status")}: {t(`subscriptions.status.${statusFilter}`)}
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="gap-1">
                  <Search className="h-3 w-3" />
                  {t("common.search")}: {searchTerm}
                </Badge>
              )}
            </div>
            <Button onClick={handleSearchAndFilter} disabled={isLoading}>
              {isLoading ? t("common.searching") : t("userSubscriptions.applyFilters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        isMobile ? (
          <CardListSkeleton />
        ) : (
          <TableSkeleton />
        )
      ) : userSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                <List className="h-6 w-6 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {t("userSubscriptions.noSubscriptionsFoundTitle")}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== "all"
                  ? t("userSubscriptions.noSubscriptionsFoundFiltered")
                  : t("userSubscriptions.noSubscriptionsFound")}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {userSubscriptions.map((subscription) => (
            <UserSubscriptionAdminCard
              key={String(subscription._id)}
              userSubscription={subscription}
              onSubscriptionUpdate={() => fetchData(currentPage, limit, searchTerm, statusFilter)}
              onEdit={handleEdit}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                {" "}
                {/* Adjusted min-width */}
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.tableHeaders.user")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.tableHeaders.subscriptionDetails")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.tableHeaders.treatmentDetails")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.tableHeaders.quantityUsage")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.tableHeaders.dates")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.tableHeaders.payment")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.tableHeaders.status")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.tableHeaders.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {userSubscriptions.map((subscription) => (
                    <UserSubscriptionRow
                      key={String(subscription._id)}
                      userSubscription={subscription}
                      onSubscriptionUpdate={() => fetchData(currentPage, limit, searchTerm, statusFilter)}
                      onEdit={handleEdit}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t("common.pagination.pageInfo")} - {t("common.pagination.page")}: {pagination.page}, {t("common.pagination.total")}: {pagination.total}, {t("common.pagination.totalResults")}: {pagination.totalResults}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoading}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              {t("common.previous")}
            </Button>

            {/* Simplified pagination numbers for brevity, can be expanded */}
            <span className="text-sm p-2">
              {currentPage} / {pagination.totalPages}
            </span>

            <Select
              value={limit.toString()}
              onValueChange={(value) => {
                setLimit(Number.parseInt(value))
                setCurrentPage(1) // Reset to page 1 when limit changes
                fetchData(1, Number.parseInt(value), searchTerm, statusFilter)
              }}
            >
              <SelectTrigger className="w-24">
                <SelectValue placeholder={limit.toString()} />
              </SelectTrigger>
              <SelectContent>
                {[5, 10, 20, 50].map((l) => (
                  <SelectItem key={l} value={l.toString()}>
                    {t("common.pagination.showPerPage")} {l}
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
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("userSubscriptions.createNew")}</DialogTitle>
          </DialogHeader>
          <CreateUserSubscriptionForm
            onSubmit={handleCreate}
            isLoading={isSaving}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("common.edit")}</DialogTitle>
          </DialogHeader>
          {currentSubscription && (
            <UserSubscriptionForm
              initialData={{
                _id: String(currentSubscription._id),
                remainingQuantity: currentSubscription.remainingQuantity,
                expiryDate: String(currentSubscription.expiryDate),
                totalQuantity: currentSubscription.totalQuantity,
              }}
              onSubmit={handleUpdate}
              isLoading={isSaving}
              onCancel={() => setIsEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminUserSubscriptionsClient
