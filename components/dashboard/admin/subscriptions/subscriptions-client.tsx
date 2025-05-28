"use client"

import { useTranslation } from "@/lib/translations/i18n"
import SubscriptionCard from "./subscription-card"
import { useState } from "react"
import { Button } from "@/components/common/ui/button"
import { Plus } from "lucide-react"
import { Card, CardContent } from "@/components/common/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import SubscriptionForm from "./subscription-form"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { createSubscription, updateSubscription, deleteSubscription } from "@/actions/subscription-actions"
import { toast } from "sonner"
import { Pagination } from "@/components/common/ui/pagination"

interface SubscriptionsClientProps {
  initialSubscriptions?: any[]
  treatments?: any[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const SubscriptionsClient = ({ initialSubscriptions = [], treatments = [], pagination }: SubscriptionsClientProps) => {
  const { t } = useTranslation()
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [currentSubscription, setCurrentSubscription] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(pagination?.page || 1)

  const handleCreate = async (data: any) => {
    setIsLoading(true)
    try {
      const result = await createSubscription(data)
      if (result.success) {
        setSubscriptions([...subscriptions, result.subscription])
        toast.success(t("subscriptions.createSuccess"))
        setIsCreateDialogOpen(false)
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (subscription: any) => {
    setCurrentSubscription(subscription)
    setIsEditDialogOpen(true)
  }

  const handleUpdate = async (data: any) => {
    if (!currentSubscription) return

    setIsLoading(true)
    try {
      const result = await updateSubscription(currentSubscription._id, data)
      if (result.success) {
        setSubscriptions(subscriptions.map((s) => (s._id === currentSubscription._id ? result.subscription : s)))
        toast.success(t("subscriptions.updateSuccess"))
        setIsEditDialogOpen(false)
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteClick = (subscription: any) => {
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
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Here you would typically fetch data for the new page
    // For now, we'll just update the state
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
