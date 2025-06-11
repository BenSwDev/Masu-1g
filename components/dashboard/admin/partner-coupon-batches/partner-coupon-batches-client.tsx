"use client"

import * as React from "react"
import { PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/common/ui/button"
import { DataTable } from "@/components/common/ui/data-table"
import { useToast } from "@/components/common/ui/use-toast"
import type { IPartnerCouponBatch } from "@/lib/db/models/partner-coupon-batch"
import { PartnerCouponBatchForm, type PartnerCouponBatchFormValues } from "./partner-coupon-batch-form"
import { type getPartnerCouponBatches, createPartnerCouponBatch, updatePartnerCouponBatch, deletePartnerCouponBatch, getBatchCoupons } from "@/actions/partner-coupon-batch-actions"
import { columns as batchColumnsDefinition } from "./partner-coupon-batches-columns"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/common/ui/alert-dialog"
import { useTranslation } from "@/lib/translations/i18n"
import { useIsMobile } from "@/components/common/ui/use-mobile"
import { PartnerCouponBatchCard } from "./partner-coupon-batch-card"
import { BatchCouponsModal } from "./batch-coupons-modal"

interface PartnerCouponBatchesClientProps {
  initialData: Awaited<ReturnType<typeof getPartnerCouponBatches>>
  partnersForSelect: { value: string; label: string }[]
}

export default function PartnerCouponBatchesClient({ initialData, partnersForSelect }: PartnerCouponBatchesClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [batches, setBatches] = React.useState<Array<IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }>>(
    (initialData?.batches as Array<IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }>) || [],
  )
  const [pagination, setPagination] = React.useState({
    totalPages: initialData?.totalPages || 1,
    currentPage: initialData?.currentPage || 1,
    totalBatches: initialData?.totalBatches || 0,
  })
  const [loading, setLoading] = React.useState(false)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingBatch, setEditingBatch] = React.useState<(IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }) | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [batchToDelete, setBatchToDelete] = React.useState<string | null>(null)
  const [isCouponsModalOpen, setIsCouponsModalOpen] = React.useState(false)
  const [selectedBatchForCoupons, setSelectedBatchForCoupons] = React.useState<(IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }) | null>(null)

  const { t, dir } = useTranslation()

  const handleCreateNew = () => {
    setEditingBatch(null)
    setIsFormOpen(true)
  }

  const handleEdit = (batch: IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }) => {
    setEditingBatch(batch)
    setIsFormOpen(true)
  }

  const handleViewCoupons = (batch: IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }) => {
    setSelectedBatchForCoupons(batch)
    setIsCouponsModalOpen(true)
  }

  const handleDeleteRequest = (batchId: string) => {
    setBatchToDelete(batchId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!batchToDelete) return
    setLoading(true)
    try {
      const result = await deletePartnerCouponBatch(batchToDelete)
      if (result.success) {
        toast({ title: t("common.success"), description: t("adminPartnerCouponBatches.toast.deleteSuccess") })
        setBatches((prev) => prev.filter((b) => b._id.toString() !== batchToDelete))
        setPagination((prev) => ({ ...prev, totalBatches: prev.totalBatches - 1 }))
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("adminPartnerCouponBatches.toast.deleteError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("adminPartnerCouponBatches.toast.deleteError"), variant: "destructive" })
    } finally {
      setLoading(false)
      setIsDeleteDialogOpen(false)
      setBatchToDelete(null)
    }
  }

  const handleFormSubmit = async (values: PartnerCouponBatchFormValues) => {
    setLoading(true)
    try {
      let result
      if (editingBatch) {
        result = await updatePartnerCouponBatch({ ...values, id: editingBatch._id.toString() })
      } else {
        result = await createPartnerCouponBatch(values)
      }

      if (result.success && result.batch) {
        toast({
          title: t("common.success"),
          description: editingBatch 
            ? t("adminPartnerCouponBatches.toast.updateSuccess") 
            : t("adminPartnerCouponBatches.toast.createSuccess", { count: result.couponsCreated || 0 }),
        })
        setIsFormOpen(false)
        setEditingBatch(null)
        
        if (editingBatch) {
          setBatches((prev) =>
            prev.map((b) =>
              b._id.toString() === result.batch?._id.toString()
                ? { ...result.batch, effectiveStatus: "active", activeCouponsCount: 0 } as IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }
                : b,
            ),
          )
        } else {
          setBatches((prev) => [{ ...result.batch, effectiveStatus: "active", activeCouponsCount: values.couponCount } as IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }, ...prev])
          setPagination((prev) => ({ ...prev, totalBatches: prev.totalBatches + 1 }))
        }
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("adminPartnerCouponBatches.toast.formError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("adminPartnerCouponBatches.toast.formError"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const onEditRef = React.useRef(handleEdit)
  const onDeleteRef = React.useRef(handleDeleteRequest)
  const onViewCouponsRef = React.useRef(handleViewCoupons)

  React.useEffect(() => {
    onEditRef.current = handleEdit
    onDeleteRef.current = handleDeleteRequest
    onViewCouponsRef.current = handleViewCoupons
  })

  const memoizedColumns = React.useMemo(
    () =>
      batchColumnsDefinition({
        onEdit: (batch) => onEditRef.current(batch),
        onDelete: (batchId) => onDeleteRef.current(batchId),
        onViewCoupons: (batch) => onViewCouponsRef.current(batch),
        t,
        dir,
      }),
    [t, dir],
  )

  const isMobile = useIsMobile()

  React.useEffect(() => {
    setBatches((initialData?.batches as Array<IPartnerCouponBatch & { effectiveStatus: string; activeCouponsCount: number }>) || [])
    setPagination({
      totalPages: initialData?.totalPages || 1,
      currentPage: initialData?.currentPage || 1,
      totalBatches: initialData?.totalBatches || 0,
    })
  }, [initialData])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Button onClick={handleCreateNew} disabled={loading}>
          <PlusCircle className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} /> {t("adminPartnerCouponBatches.createNew")}
        </Button>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {batches.map((batch) => (
            <PartnerCouponBatchCard
              key={batch._id.toString()}
              batch={batch}
              onEdit={onEditRef.current}
              onDelete={onDeleteRef.current}
              onViewCoupons={onViewCouponsRef.current}
              t={t}
              dir={dir}
            />
          ))}
          {batches.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-4">
              {t("adminPartnerCouponBatches.noBatchesFound", "No partner coupon batches found.")}
            </p>
          )}
        </div>
      ) : (
        <>
          <DataTable
            columns={memoizedColumns}
            data={batches}
          />
          <p className="text-sm text-muted-foreground mt-2">
            {t("adminPartnerCouponBatches.totalBatches", { count: pagination.totalBatches })}
          </p>
        </>
      )}

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingBatch(null)
          }
          setIsFormOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {editingBatch ? t("adminPartnerCouponBatches.form.titleEdit") : t("adminPartnerCouponBatches.form.titleCreate")}
            </DialogTitle>
            <DialogDescription>
              {editingBatch ? t("adminPartnerCouponBatches.form.descriptionEdit") : t("adminPartnerCouponBatches.form.descriptionCreate")}
            </DialogDescription>
          </DialogHeader>
          <PartnerCouponBatchForm
            initialData={editingBatch}
            partnersForSelect={partnersForSelect}
            onSubmit={handleFormSubmit}
            onCancel={() => setIsFormOpen(false)}
            loading={loading}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("adminPartnerCouponBatches.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("adminPartnerCouponBatches.deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? t("adminPartnerCouponBatches.deleteDialog.deletingButton") : t("adminPartnerCouponBatches.deleteDialog.confirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedBatchForCoupons && (
        <BatchCouponsModal
          open={isCouponsModalOpen}
          onOpenChange={setIsCouponsModalOpen}
          batch={selectedBatchForCoupons}
          onClose={() => {
            setIsCouponsModalOpen(false)
            setSelectedBatchForCoupons(null)
          }}
        />
      )}
    </>
  )
} 