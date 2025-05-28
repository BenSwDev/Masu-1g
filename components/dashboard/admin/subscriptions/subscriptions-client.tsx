"use client"

import { useTranslation } from "@/lib/translations/i18n"
import SubscriptionCard from "./subscription-card"
import { useState } from "react"
import { Button } from "@/components/common/ui/button"
import { Plus } from "lucide-react"
import { Card, CardContent } from "@/components/common/ui/card"
import SubscriptionForm from "./subscription-form"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { deleteSubscription } from "@/actions/subscription-actions"
import { toast } from "sonner"
import { Pagination } from "@/components/common/ui/pagination"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment } from "@/lib/db/models/treatment"

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

  const handleCreateSuccess = (subscription: ISubscription) => {
    setSubscriptions([...subscriptions, subscription])
    setIsCreateDialogOpen(false)
  }

  const handleEdit = (subscription: ISubscription) => {
    setCurrentSubscription(subscription)
    setIsEditDialogOpen(true)
  }

  const handleUpdateSuccess = (subscription: ISubscription) => {
    setSubscriptions(subscriptions.map((s) => (s._id === subscription._id ? subscription : s)))
    setIsEditDialogOpen(false)
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
    // TODO: Implement data fetching for new page
    // This would typically involve calling a server action with the new page number
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <Pagination currentPage={currentPage} totalPages={pagination.totalPages} onPageChange={handlePageChange} />
        </div>
      )}

      {/* Create Form */}
      <SubscriptionForm
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        treatments={treatments}
        onSuccess={handleCreateSuccess}
      />

      {/* Edit Form */}
      <SubscriptionForm
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        subscription={currentSubscription}
        treatments={treatments}
        onSuccess={handleUpdateSuccess}
      />

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
