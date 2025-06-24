"use client"

import * as React from "react"
import { PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/common/ui/button"
import { DataTable } from "@/components/common/ui/data-table"
import { useToast } from "@/components/common/ui/use-toast"
import type { IPartnerCouponBatch } from "@/lib/db/models/partner-coupon-batch"
import { PartnerCouponBatchForm, type PartnerCouponBatchFormValues } from "./partner-coupon-batch-form"
import { type getPartnerCouponBatches, createPartnerCouponBatch, updatePartnerCouponBatch, deletePartnerCouponBatch, getBatchCoupons } from "@/app/dashboard/(user)/(roles)/admin/partner-coupon-batches/actions"
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
import type { TFunction } from "i18next"

type BatchWithStatus = IPartnerCouponBatch & { 
  effectiveStatus: string; 
  activeCouponsCount: number 
}

interface ServerBatch extends Omit<BatchWithStatus, '_id'> {
  _id: string
}

interface PartnerCouponBatch extends Omit<BatchWithStatus, '_id'> {
  _id: string // Changed from ObjectId to string for client-side
}

interface PartnerCouponBatchesClientProps {
  initialData: Awaited<ReturnType<typeof getPartnerCouponBatches>>
  partnersForSelect: { value: string; label: string }[]
}

export default function PartnerCouponBatchesClient({ initialData, partnersForSelect }: PartnerCouponBatchesClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [batches, setBatches] = React.useState<PartnerCouponBatch[]>(
    (initialData?.batches?.map(batch => ({
      ...batch,
      _id: typeof batch._id === "string" ? batch._id : String(batch._id),
      effectiveStatus: batch.effectiveStatus || "active",
      activeCouponsCount: batch.activeCouponsCount || 0
    })) as PartnerCouponBatch[]) || []
  )
  const [pagination, setPagination] = React.useState({
    totalPages: initialData?.totalPages || 1,
    currentPage: initialData?.currentPage || 1,
    totalBatches: initialData?.totalBatches || 0,
  })
  const [loading, setLoading] = React.useState(false)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingBatch, setEditingBatch] = React.useState<PartnerCouponBatch | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [batchToDelete, setBatchToDelete] = React.useState<string | null>(null)
  const [isCouponsModalOpen, setIsCouponsModalOpen] = React.useState(false)
  const [selectedBatch, setSelectedBatch] = React.useState<PartnerCouponBatch | null>(null)

  const { t, dir } = useTranslation()

  const handleCreateNew = () => {
    setEditingBatch(null)
    setIsFormOpen(true)
  }

  const handleEdit = (batch: BatchWithStatus) => {
    setEditingBatch({
      ...batch,
      _id: typeof batch._id === "string" ? batch._id : String(batch._id),
      effectiveStatus: batch.effectiveStatus || "active",
      activeCouponsCount: batch.activeCouponsCount || 0
    } as PartnerCouponBatch)
    setIsFormOpen(true)
  }

  const handleViewCoupons = (batch: BatchWithStatus) => {
    setSelectedBatch({
      ...batch,
      _id: typeof batch._id === "string" ? batch._id : String(batch._id),
      effectiveStatus: batch.effectiveStatus || "active",
      activeCouponsCount: batch.activeCouponsCount || 0
    } as PartnerCouponBatch)
    setIsCouponsModalOpen(true)
  }

  const handleDeleteRequest = (batchId: string) => {
    setBatchToDelete(batchId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!batchToDelete) return

    try {
      const result = await deletePartnerCouponBatch(batchToDelete)
      if (result.success) {
        toast({ title: t("common.success"), description: t("adminPartnerCouponBatches.toast.deleteSuccess") })
        
        // Update batches list and pagination
        setBatches((prev) => prev.filter((b) => b._id.toString() !== batchToDelete))
        setPagination((prev) => ({ 
          ...prev, 
          totalBatches: Math.max(0, prev.totalBatches - 1),
          // If we deleted the last item on a page and it's not the first page, go to previous page
          currentPage: prev.totalBatches <= 1 && prev.currentPage > 1 ? prev.currentPage - 1 : prev.currentPage
        }))
        
        // Force a refresh from server
        window.location.reload()
      } else {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: result.error || t("adminPartnerCouponBatches.toast.deleteError")
        })
      }
    } catch (error) {
      console.error("Error deleting batch:", error)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("adminPartnerCouponBatches.toast.deleteError")
      })
    } finally {
      setIsDeleteDialogOpen(false)
      setBatchToDelete(null)
    }
  }

  const handleFormSubmit = async (_values: PartnerCouponBatchFormValues) => {
    try {
      let result
      if (editingBatch) {
        result = await updatePartnerCouponBatch({ ...values, id: editingBatch._id.toString() })
      } else {
        result = await createPartnerCouponBatch(values)
      }

      if (result.success) {
        toast({
          title: t("common.success"),
          description: editingBatch 
            ? t("adminPartnerCouponBatches.toast.updateSuccess") 
            : t("adminPartnerCouponBatches.toast.createSuccess")
        })
        setIsFormOpen(false)
        setEditingBatch(null)

        // Update the batches list
        if (result.batch) {
          setBatches((prev) =>
            prev.map((b) =>
              b._id.toString() === result.batch?._id.toString()
                ? { ...result.batch, effectiveStatus: "active", activeCouponsCount: 0 } as PartnerCouponBatch
                : b
            )
          )
        }
      } else {
        toast({
          variant: "destructive",
          title: t("common.error"),
          description: result.error || t("adminPartnerCouponBatches.toast.error")
        })
      }
    } catch (error) {
      console.error("Error saving batch:", error)
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: t("adminPartnerCouponBatches.toast.error")
      })
    }
  }

  const onEditRef = React.useRef(handleEdit)
  const onDeleteRef = React.useRef(handleDeleteRequest)
  const onViewCouponsRef = React.useRef(handleViewCoupons)

  React.useEffect(() => {
    onEditRef.current = handleEdit
    onDeleteRef.current = handleDeleteRequest
    onViewCouponsRef.current = handleViewCoupons
  }, [])

  const memoizedColumns = React.useMemo(
    () =>
      batchColumnsDefinition({
        onEdit: (batch) => onEditRef.current(batch as BatchWithStatus),
        onDelete: (batchId) => onDeleteRef.current(batchId),
        onViewCoupons: (batch) => onViewCouponsRef.current(batch as BatchWithStatus),
        t: t as TFunction,
        dir,
      }),
    [t, dir],
  )

  const isMobile = useIsMobile()

  React.useEffect(() => {
    setBatches(
      (initialData?.batches?.map(batch => ({
        ...batch,
        _id: typeof batch._id === "string" ? batch._id : String(batch._id),
        effectiveStatus: batch.effectiveStatus || "active",
        activeCouponsCount: batch.activeCouponsCount || 0
      })) as PartnerCouponBatch[]) || []
    )
    setPagination({
      totalPages: initialData?.totalPages || 1,
      totalBatches: initialData?.totalBatches || 0,
      currentPage: initialData?.currentPage || 1,
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
              batch={batch as unknown as IPartnerCouponBatch & { _id: string; effectiveStatus: string; activeCouponsCount: number }}
              onEdit={onEditRef.current}
              onDelete={onDeleteRef.current}
              onViewCoupons={onViewCouponsRef.current}
              t={t as TFunction}
              dir={dir}
            />
          ))}
          {batches.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-4">
              {t("adminPartnerCouponBatches.noBatchesFound")}
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
            {t("adminPartnerCouponBatches.totalBatches")}
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

      {selectedBatch && (
        <BatchCouponsModal
          open={isCouponsModalOpen}
          onOpenChange={setIsCouponsModalOpen}
          batch={selectedBatch}
          onClose={() => {
            setIsCouponsModalOpen(false)
            setSelectedBatch(null)
          }}
        />
      )}
    </>
  )
} 