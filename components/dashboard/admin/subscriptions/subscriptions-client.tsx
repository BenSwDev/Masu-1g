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
import { Plus, Search } from "lucide-react"
import SubscriptionCard from "./subscription-card"
import SubscriptionForm from "./subscription-form"
import { AlertModal } from "@/components/common/modals/alert-modal"
import { toast } from "sonner"
import { deleteSubscription } from "@/actions/subscription-actions"
import type { ISubscription } from "@/lib/db/models/subscription"

interface SubscriptionsClientProps {
  initialSubscriptions: any[]
  treatments: any[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function SubscriptionsClient({
  initialSubscriptions,
  treatments,
  pagination,
}: SubscriptionsClientProps) {
  const { t } = useTranslation()
  const [subscriptions, setSubscriptions] = useState(initialSubscriptions)
  const [showForm, setShowForm] = useState(false)
  const [editingSubscription, setEditingSubscription] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(pagination.page)

  const handleAddNew = () => {
    setEditingSubscription(null)
    setShowForm(true)
  }

  const handleEdit = (subscription: any) => {
    setEditingSubscription(subscription)
    setShowForm(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setEditingSubscription(null)
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    try {
      const result = await deleteSubscription(id)
      if (result.success) {
        toast.success(t("subscriptions.deleteSuccess"))
        setSubscriptions(subscriptions.filter((sub) => sub._id !== id))
      } else {
        toast.error(result.error || t("common.error"))
      }
    } catch (error) {
      toast.error(t("common.error"))
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const confirmDelete = (id: string) => {
    setDeleteId(id)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // כאן יש להוסיף לוגיקה לחיפוש מנויים
    // לדוגמה: fetchSubscriptions({ search: searchQuery })
  }

  const handleSuccess = (subscription: ISubscription) => {
    if (editingSubscription) {
      // עדכון מנוי קיים
      setSubscriptions(subscriptions.map((sub) => (sub._id === subscription._id ? subscription : sub)))
    } else {
      // הוספת מנוי חדש
      setSubscriptions([subscription, ...subscriptions])
    }
    setShowForm(false)
    setEditingSubscription(null)
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t("subscriptions.manage")}</CardTitle>
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
              <Button onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                {t("subscriptions.addNew")}
              </Button>
            </div>

            {subscriptions.length === 0 ? (
              <div className="text-center py-12">
                <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">{t("subscriptions.noSubscriptions")}</h3>
                <p className="text-gray-500 mb-6">{t("subscriptions.addFirstSubscription")}</p>
                <Button onClick={handleAddNew}>
                  <Plus className="mr-2 h-4 w-4" />
                  {t("subscriptions.addNew")}
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {subscriptions.map((subscription) => (
                  <SubscriptionCard
                    key={subscription._id}
                    subscription={subscription}
                    onEdit={() => handleEdit(subscription)}
                    onDelete={() => confirmDelete(subscription._id)}
                  />
                ))}
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
                          setCurrentPage(currentPage - 1)
                          // כאן יש להוסיף לוגיקה לטעינת העמוד הקודם
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
                          setCurrentPage(currentPage + 1)
                          // כאן יש להוסיף לוגיקה לטעינת העמוד הבא
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

      <SubscriptionForm
        open={showForm}
        onOpenChange={setShowForm}
        subscription={editingSubscription}
        treatments={treatments}
        onSuccess={handleSuccess}
      />

      <AlertModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        loading={isDeleting}
      />
    </>
  )
}
