"use client"

import type React from "react"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Input } from "@/components/common/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/ui/card"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/common/ui/pagination"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"
import { Search, Filter } from "lucide-react"
import UserSubscriptionRow from "./user-subscription-row"
import { useRouter } from "next/navigation"

interface AdminUserSubscriptionsClientProps {
  initialUserSubscriptions: any[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function AdminUserSubscriptionsClient({
  initialUserSubscriptions,
  pagination,
}: AdminUserSubscriptionsClientProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [userSubscriptions, setUserSubscriptions] = useState(initialUserSubscriptions)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(pagination.page)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // כאן יש להוסיף לוגיקה לחיפוש מנויים
    // לדוגמה: fetchUserSubscriptions({ search: searchQuery, status: statusFilter })
  }

  const handleStatusChange = (status: string) => {
    setStatusFilter(status)
    // כאן יש להוסיף לוגיקה לסינון לפי סטטוס
    // לדוגמה: fetchUserSubscriptions({ search: searchQuery, status })
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // כאן יש להוסיף לוגיקה לטעינת עמוד
    // לדוגמה: fetchUserSubscriptions({ page, search: searchQuery, status: statusFilter })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("subscriptions.userSubscriptions.manage")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <form onSubmit={handleSearch} className="flex w-full sm:w-auto gap-2">
              <Input
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-80"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <Select value={statusFilter} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder={t("common.status")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("common.all")}</SelectItem>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="expired">{t("subscriptions.status.expired")}</SelectItem>
                <SelectItem value="depleted">{t("subscriptions.status.depleted")}</SelectItem>
                <SelectItem value="cancelled">{t("subscriptions.status.cancelled")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {userSubscriptions.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Filter className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t("subscriptions.userSubscriptions.noSubscriptions")}
              </h3>
              <p className="text-gray-500 mb-6">{t("subscriptions.userSubscriptions.noSubscriptionsDescription")}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("common.user")}</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("subscriptions.name")}</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("subscriptions.remaining")}</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("subscriptions.expiry")}</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("common.status")}</th>
                    <th className="py-3 px-4 text-right font-medium text-gray-500">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {userSubscriptions.map((userSubscription) => (
                    <UserSubscriptionRow key={userSubscription._id} userSubscription={userSubscription} />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <Pagination className="mt-6">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage > 1) {
                        handlePageChange(currentPage - 1)
                      }
                    }}
                    className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-4">
                    {t("common.pagination", { current: currentPage, total: pagination.totalPages })}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      if (currentPage < pagination.totalPages) {
                        handlePageChange(currentPage + 1)
                      }
                    }}
                    className={currentPage >= pagination.totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
