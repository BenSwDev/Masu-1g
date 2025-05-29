"use client"

import { Button } from "@/components/ui/button"

import { Card, CardContent } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Search } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useState, useEffect } from "react"
// Removed Pagination component import as it's custom implemented below
import UserSubscriptionRow from "./user-subscription-row"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { User } from "next-auth" // Assuming User type from next-auth
import { getAllUserSubscriptions } from "@/actions/user-subscription-actions" // For fetching data
import { toast } from "sonner"
import { Skeleton } from "@/components/common/ui/skeleton" // For loading state

interface PopulatedUserSubscription extends IUserSubscription {
  userId: Pick<User, "name" | "email"> & { _id: string } // Assuming User has name and email
  subscriptionId: ISubscription
  treatmentId: ITreatment
  selectedDurationDetails?: ITreatmentDuration
  paymentMethodId: { _id: string; cardName?: string; cardNumber: string } // Basic payment method info
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
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(initialPagination?.page || 1)
  const [limit, setLimit] = useState(initialPagination?.limit || 10)
  const [isLoading, setIsLoading] = useState(false)

  const [userSubscriptions, setUserSubscriptions] = useState<PopulatedUserSubscription[]>(initialUserSubscriptions)
  const [pagination, setPagination] = useState(initialPagination)

  const fetchData = async (page: number, currentLimit: number, search: string, status: string) => {
    setIsLoading(true)
    try {
      const result = await getAllUserSubscriptions({
        page,
        limit: currentLimit,
        search: search || undefined, // Pass undefined if empty
        status: status === "all" ? undefined : status,
      })
      if (result.success && result.userSubscriptions && result.pagination) {
        setUserSubscriptions(result.userSubscriptions as PopulatedUserSubscription[])
        setPagination(result.pagination)
      } else {
        toast.error(result.error || t("userSubscriptions.fetchErrorAdmin"))
      }
    } catch (error) {
      toast.error(t("userSubscriptions.fetchErrorAdmin"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Initial fetch is done via props, this effect is for subsequent fetches on filter/page change
    // To avoid double fetch on mount if initial data is present, check if it's not the initial load
    if (
      initialUserSubscriptions.length > 0 &&
      currentPage === initialPagination?.page &&
      searchTerm === "" &&
      statusFilter === "all" &&
      limit === initialPagination?.limit
    ) {
      // This is the initial state, data already loaded via props
      return
    }
    fetchData(currentPage, limit, searchTerm, statusFilter)
  }, [currentPage, limit]) // Removed searchTerm, statusFilter from deps to trigger fetch via button/explicit action

  const handleSearchAndFilter = () => {
    setCurrentPage(1) // Reset to first page on new search/filter
    fetchData(1, limit, searchTerm, statusFilter)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= (pagination?.totalPages || 1)) {
      setCurrentPage(newPage)
    }
  }

  const TableSkeleton = () => (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50 dark:bg-gray-800">
                {Array(7)
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
                    {Array(7)
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t("userSubscriptions.title")}</h1>
          <p className="text-gray-600 dark:text-gray-300">{t("userSubscriptions.description")}</p>
        </div>
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
                  <SelectValue placeholder={t("userSubscriptions.filterByStatus")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("userSubscriptions.allStatuses")}</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="expired">{t("common.expired")}</SelectItem>
                  <SelectItem value="depleted">{t("common.depleted")}</SelectItem>
                  <SelectItem value="cancelled">{t("common.cancelled")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSearchAndFilter} disabled={isLoading}>
              {isLoading ? t("common.searching") : t("common.applyFilters")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <TableSkeleton />
      ) : userSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500 dark:text-gray-400">{t("userSubscriptions.noUserSubscriptions")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b bg-gray-50 dark:bg-gray-800">
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.user")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.subscriptionDetails")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.treatmentDetails")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.quantityAndUsage")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.dates")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.payment")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("userSubscriptions.status")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500 dark:text-gray-400">
                      {t("common.actions")}
                    </th>
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-6 gap-4">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t("common.page")} {pagination.page} {t("common.of")} {pagination.totalPages} ({pagination.total}{" "}
            {t("common.results")})
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
            <Select
              value={limit.toString()}
              onValueChange={(value) => {
                setLimit(Number.parseInt(value))
                setCurrentPage(1) // Reset to page 1 when limit changes
                // fetchData will be called by useEffect
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
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUserSubscriptionsClient
