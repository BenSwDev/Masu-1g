"use client"

import { Card, CardContent } from "@/components/common/ui/card"
import { useTranslation } from "@/lib/translations/i18n"
import { Search } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { useState } from "react"
import UserSubscriptionRow from "./user-subscription-row"

interface AdminUserSubscriptionsClientProps {
  userSubscriptions?: any[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const AdminUserSubscriptionsClient = ({ userSubscriptions = [], pagination }: AdminUserSubscriptionsClientProps) => {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(pagination?.page || 1)
  const [isLoading, setIsLoading] = useState(false)

  // Filter subscriptions based on search term and status filter
  const filteredSubscriptions = userSubscriptions.filter((subscription) => {
    const matchesSearch =
      !searchTerm ||
      subscription.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.subscriptionId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      subscription.treatmentId?.name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || subscription.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    setIsLoading(true)
    // Here you would typically fetch data for the new page
    setTimeout(() => setIsLoading(false), 500) // Simulate loading
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("userSubscriptions.title")}</h1>
          <p className="text-gray-600">{t("userSubscriptions.description")}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder={t("userSubscriptions.searchPlaceholder")}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </CardContent>
        </Card>
      ) : filteredSubscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500">{t("userSubscriptions.noUserSubscriptions")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("userSubscriptions.user")}</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">
                      {t("userSubscriptions.subscription")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">
                      {t("userSubscriptions.treatment")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">
                      {t("userSubscriptions.remaining")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">
                      {t("userSubscriptions.expiryDate")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">
                      {t("userSubscriptions.amountPaid")}
                    </th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("userSubscriptions.status")}</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSubscriptions.map((subscription) => (
                    <UserSubscriptionRow key={String(subscription._id)} userSubscription={subscription} />
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              disabled={currentPage === 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              {t("common.previous")}
            </button>
            <span className="px-3 py-1">
              {currentPage} / {pagination.totalPages}
            </span>
            <button
              className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              disabled={currentPage === pagination.totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUserSubscriptionsClient
