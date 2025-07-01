"use client"

import * as React from "react"
import { Check, Copy, Edit, CheckSquare, Square } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/components/ui/use-toast"
import { DataTable } from "@/components/ui/data-table"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { IPartnerCouponBatch } from "@/lib/db/models/partner-coupon-batch"
import type { ICoupon } from "@/lib/db/models/coupon"
import {
  getBatchCoupons,
  updateCouponsInBatch,
} from "@/app/dashboard/(user)/(roles)/admin/partner-coupon-batches/actions"
import { useTranslation } from "@/lib/translations/i18n"
import { formatDate, formatCurrency } from "@/lib/utils"
import { StatusBadge } from "../coupons/coupons-columns"
import type { ColumnDef } from "@tanstack/react-table"

interface BatchCouponsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }
  onClose: () => void
}

export function BatchCouponsModal({ open, onOpenChange, batch, onClose }: BatchCouponsModalProps) {
  const { t, dir } = useTranslation()
  const { toast } = useToast()

  const [coupons, setCoupons] = React.useState<(ICoupon & { effectiveStatus: string })[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedCoupons, setSelectedCoupons] = React.useState<string[]>([])
  const [isUpdating, setIsUpdating] = React.useState(false)

  // Load coupons when modal opens
  React.useEffect(() => {
    if (open && batch) {
      loadCoupons()
    }
  }, [open, batch])

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const result = await getBatchCoupons(batch._id.toString?.() || '')
      setCoupons(result.coupons)
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("adminPartnerCouponBatches.toast.loadCouponsError"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      toast({
        title: t("common.success"),
        description: t("adminPartnerCouponBatches.toast.codeCopied"),
      })
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("adminPartnerCouponBatches.toast.copyError"),
        variant: "destructive",
      })
    }
  }

  const handleSelectCoupon = (couponId: string, selected: boolean) => {
    if (selected) {
      setSelectedCoupons(prev => [...prev, couponId])
    } else {
      setSelectedCoupons(prev => prev.filter(id => id !== couponId))
    }
  }

  const handleSelectAll = () => {
    if (selectedCoupons.length === coupons.length) {
      setSelectedCoupons([])
    } else {
      setSelectedCoupons(coupons.map(c => c._id.toString?.() || ''))
    }
  }

  const handleBulkToggleActive = async (isActive: boolean) => {
    if (selectedCoupons.length === 0) return

    setIsUpdating(true)
    try {
      const result = await updateCouponsInBatch({
        batchId: batch._id.toString?.() || '',
        couponIds: selectedCoupons,
        updates: { isActive },
      })

      if (result.success) {
        toast({
          title: t("common.success"),
          description: t("adminPartnerCouponBatches.toast.bulkUpdateSuccess", {
            count: result.updatedCount,
          }),
        })
        await loadCoupons() // Reload to see updated status
        setSelectedCoupons([])
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("adminPartnerCouponBatches.toast.bulkUpdateError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("adminPartnerCouponBatches.toast.bulkUpdateError"),
        variant: "destructive",
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const columns: ColumnDef<ICoupon & { effectiveStatus: string }>[] = React.useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={selectedCoupons.length === coupons.length && coupons.length > 0}
            onCheckedChange={handleSelectAll}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedCoupons.includes(row.original._id.toString?.() || '')}
            onCheckedChange={checked => handleSelectCoupon(row.original._id.toString?.() || '', !!checked)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "code",
        header: t("adminPartnerCouponBatches.couponModal.columns.code"),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono text-xs">
              {row.original.code}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopyCode(row.original.code)}
              className="h-6 w-6 p-0"
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>
        ),
      },
      {
        accessorKey: "effectiveStatus",
        header: t("adminPartnerCouponBatches.couponModal.columns.status"),
        cell: ({ row }) => <StatusBadge status={row.original.effectiveStatus} t={t} dir={dir} />,
      },
      {
        accessorKey: "timesUsed",
        header: t("adminPartnerCouponBatches.couponModal.columns.usage"),
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.timesUsed} /{" "}
            {Number(row.original.usageLimit) === 0 ? "∞" : row.original.usageLimit}
          </span>
        ),
      },
    ],
    [coupons, selectedCoupons, t, dir]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("adminPartnerCouponBatches.couponModal.title")}: {batch.name}
            <Badge variant="secondary">
              {coupons.length} {t("adminPartnerCouponBatches.couponModal.totalCoupons")}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {t("adminPartnerCouponBatches.couponModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Batch Info */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm font-medium">
                {t("adminPartnerCouponBatches.couponModal.prefix")}:
              </p>
              <p className="text-sm text-muted-foreground">{batch.codePrefix}</p>
            </div>
            <div>
              <p className="text-sm font-medium">
                {t("adminPartnerCouponBatches.couponModal.discount")}:
              </p>
              <p className="text-sm text-muted-foreground">
                {batch.discountType === "percentage"
                  ? `${batch.discountValue}%`
                  : formatCurrency(batch.discountValue)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">
                {t("adminPartnerCouponBatches.couponModal.validFrom")}:
              </p>
              <p className="text-sm text-muted-foreground">{formatDate(batch.validFrom)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">
                {t("adminPartnerCouponBatches.couponModal.validUntil")}:
              </p>
              <p className="text-sm text-muted-foreground">{formatDate(batch.validUntil)}</p>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedCoupons.length > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <span className="text-sm font-medium">
                {t("adminPartnerCouponBatches.couponModal.selectedCount", {
                  count: selectedCoupons.length,
                })}
              </span>
              <div className="flex gap-2 ml-auto">
                <Button
                  size="sm"
                  onClick={() => handleBulkToggleActive(true)}
                  disabled={isUpdating}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckSquare className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />
                  {t("adminPartnerCouponBatches.couponModal.activateSelected")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkToggleActive(false)}
                  disabled={isUpdating}
                >
                  <Square className={dir === "rtl" ? "ml-1 h-3 w-3" : "mr-1 h-3 w-3"} />
                  {t("adminPartnerCouponBatches.couponModal.deactivateSelected")}
                </Button>
              </div>
            </div>
          )}

          {/* Coupons Table */}
          <div className="border rounded-lg">
            <ScrollArea className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="text-sm text-muted-foreground">
                    {t("adminPartnerCouponBatches.couponModal.loading")}
                  </div>
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={coupons}
                  hideDefaultPagination={true}
                  hideColumnsSelector={true}
                />
              )}
            </ScrollArea>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-muted-foreground">
              {t("adminPartnerCouponBatches.couponModal.totalCoupons")}: {coupons.length} |{" "}
              {t("adminPartnerCouponBatches.couponModal.activeCoupons")}:{" "}
              {coupons.filter(c => c.isActive).length}
            </div>
            <Button onClick={onClose}>{t("common.close")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
