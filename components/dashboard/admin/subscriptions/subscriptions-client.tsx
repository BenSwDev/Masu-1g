"use client"

import { useTranslation } from "@/lib/translations/i18n"
import SubscriptionCard from "./subscription-card"
import { useState, useEffect } from "react"
import { Button } from "@/components/common/ui/button"
import { Plus, Search, FilterX } from "lucide-react"
import { Card, CardContent } from "@/components/common/ui/card"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { Pagination } from "@/components/common/ui/pagination"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import {
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getSubscriptions,
} from "@/actions/subscription-actions"
import { toast } from "sonner"
import SubscriptionForm from "./subscription-form"
import { Input } from "@/components/common/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/ui/select"

interface SubscriptionsClientProps {
  initialSubscriptions?: ISubscription[]
  treatments?: ITreatment[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const SubscriptionsClient = ({ initialSubscriptions = [], treatments = [], pagination }: SubscriptionsClientProps) => {
  const { t } = useTranslation()
  const [subscriptions, setSubscriptions] = useState<ISubscription[]>(initialSubscriptions)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<ISubscription | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(pagination?.page || 1)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<string>("all")
  const [paginationData, setPaginationData] = useState(pagination)
  const [isSearching, setIsSearching] = useState(false)

  const fetchSubscriptions = async (page = 1, search = searchTerm, isActive?: boolean) => {
    setIsSearching(true)
    try {
      const options: any = { page, limit: 10 }

      if (search) {
        options.search = search
      }

      if (isActive !== undefined) {
        options.isActive = isActive
      }

      const result = await getSubscriptions(options)
      if (result.success) {
        setSubscriptions(result.subscriptions)
        setPaginationData(result.pagination)
      } else {
        toast.error(result.error || t("subscriptions.fetchError"))
      }
    } catch (error) {
      toast.error(t("subscriptions.fetchError"))
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    // Only fetch if we're not on the initial load
    if (searchTerm || activeFilter !== "all" || currentPage > 1) {
      const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
      fetchSubscriptions(currentPage, searchTerm, isActive)
    }
  }, [currentPage, activeFilter])

  const handleSearch = () => {
    const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
    setCurrentPage(1) // Reset to first page on new search
    fetchSubscriptions(1, searchTerm, isActive)
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setActiveFilter("all")
    setCurrentPage(1)
    fetchSubscriptions(1, "", undefined)
  }

  const handleCreate = async (data: FormData) => {
    setIsLoading(true)
    try {
      const result = await createSubscription(data)
      if (result.success) {
        setSubscriptions([result.subscription, ...subscriptions])
        toast.success(t("subscriptions.createSuccess"))
        setIsCreateDialogOpen(false)
        // Refresh the list to ensure correct ordering and pagination
        fetchSubscriptions(
          currentPage,
          searchTerm,
          activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
        )
      } else {
        toast.error(result.error || t("subscriptions.createError"))
      }
    } catch (error) {
      toast.error(t("subscriptions.createError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async (data: FormData) => {
    if (!currentSubscription) return

    setIsLoading(true)
    try {
      const result = await updateSubscription(currentSubscription._id, data)
      if (result.success) {
        setSubscriptions(subscriptions.map((s) => (s._id === currentSubscription._id ? result.subscription : s)))
        toast.success(t("subscriptions.updateSuccess"))
        setIsEditDialogOpen(false)
      } else {
        toast.error(result.error || t("subscriptions.updateError"))
      }
    } catch (error) {
      toast.error(t("subscriptions.updateError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (subscription: ISubscription) => {
    setCurrentSubscription(subscription)
    setIsEditDialogOpen(true)
  }

  const handleDeleteClick = (subscription: ISubscription) => {
    setCurrentSubscription(subscription)
    setIsDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!currentSubscription) return

    setIsLoading(true)
    try {
      const result = await deleteSubscription(currentSubscription._id)
      if (result.success) {
        setSubscriptions(subscriptions.filter((s) => s._id !== currentSubscription._id))
        toast.success(t("subscriptions.deleteSuccess"))
        setIsDeleteDialogOpen(false)

        // If we deleted the last item on a page, go to previous page
        if (subscriptions.length === 1 && currentPage > 1) {
          setCurrentPage(currentPage - 1)
          fetchSubscriptions(
            currentPage - 1,
            searchTerm,
            activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined,
          )
        }
      } else {
        toast.error(result.error || t("subscriptions.deleteError"))
      }
    } catch (error) {
      toast.error(t("subscriptions.deleteError"))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    const isActive = activeFilter === "active" ? true : activeFilter === "inactive" ? false : undefined
    fetchSubscriptions(page, searchTerm, isActive)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("subscriptions.title")}</h1>
          <p className="text-gray-600">{t("subscriptions.description")}</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t("subscriptions.addNew")}
        </Button>
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder={t("subscriptions.searchPlaceholder") || t("common.search")}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="w-full md:w-48">
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t("common.status")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="active">{t("common.active")}</SelectItem>
                  <SelectItem value="inactive">{t("common.inactive")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleSearch} disabled={isSearching}>
                {isSearching ? t("common.searching") : t("common.search")}
              </Button>
              <Button variant="ghost" onClick={handleResetFilters} disabled={isSearching}>
                <FilterX className="h-4 w-4 mr-2" />
                {t("common.reset")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-40 p-6">
            <p className="text-gray-500 mb-4">{t("subscriptions.noSubscriptions")}</p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t("subscriptions.addNew")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {subscriptions.map((subscription) => (
            <SubscriptionCard
              key={subscription._id}
              subscription={subscription}
              onEdit={() => handleEdit(subscription)}
              onDelete={() => handleDeleteClick(subscription)}
            />
          ))}
        </div>
      )}

      {paginationData && paginationData.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination
            currentPage={currentPage}
            totalPages={paginationData.totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("subscriptions.addNew")}</DialogTitle>
          </DialogHeader>
          <SubscriptionForm treatments={treatments} onSubmit={handleCreate} isLoading={isLoading} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("subscriptions.edit")}</DialogTitle>
          </DialogHeader>
          {currentSubscription && (
            <SubscriptionForm
              treatments={treatments}
              onSubmit={handleUpdate}
              isLoading={isLoading}
              initialData={currentSubscription}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertModal
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        loading={isLoading}
        title={t("subscriptions.deleteConfirm")}
        description={t("subscriptions.deleteConfirmDescription")}
      />
    </div>
  )
}

export default SubscriptionsClient
