"use client"

import type React from "react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/common/ui/dialog"
import { Button } from "@/components/common/ui/button"
import { Badge } from "@/components/common/ui/badge"
import { format } from "date-fns"
import { he } from "date-fns/locale"
import type { IUserSubscription } from "@/lib/db/models/user-subscription"
import type { ISubscription } from "@/lib/db/models/subscription"
import type { ITreatment, ITreatmentDuration } from "@/lib/db/models/treatment"
import type { User as NextAuthUser } from "next-auth"
import { ScrollArea } from "@/components/common/ui/scroll-area"
import { Separator } from "@/components/common/ui/separator"
import { useTranslation } from "@/lib/translations/i18n"

interface PopulatedUserSubscription extends IUserSubscription {
  userId?: Pick<NextAuthUser, "name" | "email"> & { _id: string } | null
  subscriptionId: ISubscription
  treatmentId: ITreatment
  selectedDurationDetails?: ITreatmentDuration
  paymentMethodId: { _id: string; cardName?: string; cardNumber: string }
  guestInfo?: {
    name: string
    email: string
    phone: string
  }
  cancellationDate?: Date | string | null
  paymentDate?: Date | string | null
  transactionId?: string | null
  usedQuantity?: number
}

interface UserSubscriptionDetailsModalProps {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  userSubscription: PopulatedUserSubscription | null
}

export default function UserSubscriptionDetailsModal({
  isOpen,
  onOpenChange,
  userSubscription,
}: UserSubscriptionDetailsModalProps) {
  const { t } = useTranslation()

  if (!userSubscription) return null

  const formatDate = (dateInput?: Date | string | null): string => {
    if (!dateInput) {
      return t("common.notAvailable")
    }
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) {
      return t("common.notAvailable")
    }
    return format(date, "dd/MM/yyyy", { locale: he })
  }
  const formatDateTime = (dateInput?: Date | string | null): string => {
    if (!dateInput) {
      return t("common.notAvailable")
    }
    const date = new Date(dateInput)
    if (isNaN(date.getTime())) {
      return t("common.notAvailable")
    }
    return format(date, "dd/MM/yyyy HH:mm", { locale: he })
  }

  const maskCardNumber = (cardNumber?: string) => (cardNumber ? `**** ${cardNumber.slice(-4)}` : t("common.unknown"))

  const getStatusInfo = (status: string) => {
    const statusConfig = {
      active: {
        label: t("subscriptions.status.active"),
        className: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
      },
      expired: {
        label: t("subscriptions.status.expired"),
        className: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
      },
      depleted: {
        label: t("subscriptions.status.depleted"),
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400",
      },
      cancelled: {
        label: t("subscriptions.status.cancelled"),
        className: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
      },
    }
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.cancelled
  }

  const statusInfo = getStatusInfo(userSubscription.status)

  const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="grid grid-cols-3 gap-2 py-2">
      <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}:</dt>
      <dd className="text-sm text-gray-900 dark:text-gray-100 col-span-2">{value}</dd>
    </div>
  )

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("userSubscriptions.detailsModal.title")}</DialogTitle>
          <DialogDescription>
            {t("userSubscriptions.detailsModal.description", {
              userName: userSubscription.userId?.name || userSubscription.guestInfo?.name || t("common.unknownUser"),
            })}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {userSubscription.userId ? t("userSubscriptions.detailsModal.userSectionTitle") : t("userSubscriptions.detailsModal.guestSectionTitle")}
              </h3>
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                {userSubscription.userId ? (
                  <>
                    <DetailItem
                      label={t("common.name")}
                      value={userSubscription.userId.name}
                    />
                    <DetailItem
                      label={t("common.email")}
                      value={userSubscription.userId.email}
                    />
                    <DetailItem label={t("common.id")} value={userSubscription.userId._id} />
                  </>
                ) : userSubscription.guestInfo ? (
                  <>
                    <DetailItem
                      label={t("common.name")}
                      value={
                        <div className="flex items-center gap-2">
                          {userSubscription.guestInfo.name}
                          <Badge variant="outline" className="text-xs">
                            {t("userSubscriptions.guest")}
                          </Badge>
                        </div>
                      }
                    />
                    <DetailItem
                      label={t("common.email")}
                      value={userSubscription.guestInfo.email}
                    />
                    <DetailItem
                      label={t("common.phone")}
                      value={userSubscription.guestInfo.phone}
                    />
                  </>
                ) : (
                  <DetailItem
                    label={t("common.name")}
                    value={t("common.unknownUser")}
                  />
                )}
              </dl>
            </section>
            <Separator />
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t("userSubscriptions.detailsModal.subscriptionSectionTitle")}
              </h3>
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                <DetailItem label={t("common.name")} value={userSubscription.subscriptionId?.name} />
                <DetailItem label={t("common.id")} value={userSubscription.subscriptionId?._id.toString()} />
                <DetailItem
                  label={t("common.status")}
                  value={<Badge className={statusInfo.className}>{statusInfo.label}</Badge>}
                />
                <DetailItem
                  label={t("userSubscriptions.purchaseDate")}
                  value={formatDate(userSubscription.purchaseDate)}
                />
                <DetailItem label={t("userSubscriptions.expiryDate")} value={formatDate(userSubscription.expiryDate)} />
                {userSubscription.cancellationDate && (
                  <DetailItem
                    label={t("userSubscriptions.cancellationDate")}
                    value={formatDateTime(userSubscription.cancellationDate)}
                  />
                )}
              </dl>
            </section>
            <Separator />
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t("userSubscriptions.detailsModal.treatmentSectionTitle")}
              </h3>
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                <DetailItem label={t("common.name")} value={userSubscription.treatmentId?.name} />
                {userSubscription.selectedDurationDetails && (
                  <DetailItem
                    label={t("treatments.duration")}
                    value={`${userSubscription.selectedDurationDetails.minutes} ${t("common.minutes")}`}
                  />
                )}
                <DetailItem
                  label={t("userSubscriptions.pricePerSession")}
                  value={`₪${userSubscription.pricePerSession?.toFixed(2) || "0.00"}`}
                />
              </dl>
            </section>
            <Separator />
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t("userSubscriptions.detailsModal.usageSectionTitle")}
              </h3>
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                <DetailItem label={t("userSubscriptions.totalQuantity")} value={userSubscription.totalQuantity} />
                <DetailItem
                  label={t("userSubscriptions.remainingQuantity")}
                  value={userSubscription.remainingQuantity}
                />
                <DetailItem label={t("userSubscriptions.usedQuantity")} value={userSubscription.usedQuantity} />
              </dl>
            </section>
            <Separator />
            <section>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {t("userSubscriptions.detailsModal.paymentSectionTitle")}
              </h3>
              <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                <DetailItem
                  label={t("userSubscriptions.paymentAmount")}
                  value={`₪${userSubscription.paymentAmount?.toFixed(2) || "0.00"}`}
                />
                <DetailItem
                  label={t("userSubscriptions.paymentMethod")}
                  value={`${userSubscription.paymentMethodId?.cardName || t("common.card")} ${maskCardNumber(userSubscription.paymentMethodId?.cardNumber)}`}
                />
                <DetailItem
                  label={t("userSubscriptions.paymentDate")}
                  value={formatDateTime(userSubscription.paymentDate)}
                />
                <DetailItem
                  label={t("userSubscriptions.transactionId")}
                  value={userSubscription.transactionId || t("common.notAvailable")}
                />
              </dl>
            </section>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{t("common.close")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
