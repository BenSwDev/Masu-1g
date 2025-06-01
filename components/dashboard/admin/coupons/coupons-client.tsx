"use client"

import * as React from "react"
import { PlusCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/common/ui/button"
import { DataTable } from "@/components/common/ui/data-table" // Assuming DataTable exists
import { useToast } from "@/components/common/ui/use-toast"
import type { ICoupon } from "@/lib/db/models/coupon"
import { CouponForm, type CouponFormValues } from "./coupon-form"
import { type getAdminCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/actions/coupon-actions"
import { columns as couponColumns } from "./coupons-columns" // We'll define this next
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

// Import useTranslation:
import { useTranslation } from "@/lib/translations/i18n"
// Import other necessary icons if they are used for RTL adjustments (e.g. ArrowLeft, ArrowRight for pagination if custom)

interface CouponsClientProps {
  initialData: Awaited<ReturnType<typeof getAdminCoupons>>
  partnersForSelect: { value: string; label: string }[]
}

export default function CouponsClient({ initialData, partnersForSelect }: CouponsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [coupons, setCoupons] = React.useState<ICoupon[]>(initialData.coupons)
  const [pagination, setPagination] = React.useState({
    totalPages: initialData.totalPages,
    currentPage: initialData.currentPage,
    totalCoupons: initialData.totalCoupons,
  })
  const [loading, setLoading] = React.useState(false)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingCoupon, setEditingCoupon] = React.useState<ICoupon | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [couponToDelete, setCouponToDelete] = React.useState<string | null>(null)

  // Inside the CouponsClient component:
  const { t, dir } = useTranslation()

  // Effect to refetch data if searchParams change (e.g. pagination from DataTable)
  // This might be handled by DataTable's own pagination logic if it updates URL
  // For simplicity, we'll assume DataTable calls onPaginationChange which updates URL or state.

  const handleCreateNew = () => {
    setEditingCoupon(null)
    setIsFormOpen(true)
  }

  const handleEdit = (coupon: ICoupon) => {
    setEditingCoupon(coupon)
    setIsFormOpen(true)
  }

  const handleDeleteRequest = (couponId: string) => {
    setCouponToDelete(couponId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!couponToDelete) return
    setLoading(true)
    try {
      const result = await deleteCoupon(couponToDelete)
      if (result.success) {
        toast({ title: t("common.success"), description: t("adminCoupons.toast.deleteSuccess") })
        // Refetch or update local state
        // For now, just filter out:
        setCoupons((prev) => prev.filter((c) => c._id !== couponToDelete))
        // Ideally, refetch current page data
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("adminCoupons.toast.deleteError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("adminCoupons.toast.deleteError"), variant: "destructive" })
    } finally {
      setLoading(false)
      setIsDeleteDialogOpen(false)
      setCouponToDelete(null)
    }
  }

  const handleFormSubmit = async (values: CouponFormValues) => {
    setLoading(true)
    try {
      let result
      if (editingCoupon) {
        result = await updateCoupon({ ...values, id: editingCoupon._id.toString() })
      } else {
        result = await createCoupon(values)
      }

      if (result.success) {
        toast({
          title: t("common.success"),
          description: editingCoupon ? t("adminCoupons.toast.updateSuccess") : t("adminCoupons.toast.createSuccess"),
        })
        setIsFormOpen(false)
        setEditingCoupon(null)
        // TODO: Refetch data or update local state more robustly
        // For now, a simple router.refresh() might work if server component re-fetches
        router.refresh()
      } else {
        toast({
          title: t("common.error"),
          description: result.error || t("adminCoupons.toast.formError"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({ title: t("common.error"), description: t("adminCoupons.toast.formError"), variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleEditRef = React.useRef(handleEdit)
  const handleDeleteRequestRef = React.useRef(handleDeleteRequest)

  React.useEffect(() => {
    handleEditRef.current = handleEdit
    handleDeleteRequestRef.current = handleDeleteRequest
  }, [handleEdit, handleDeleteRequest])

  const columns = React.useMemo(
    () =>
      couponColumns({
        onEdit: (coupon) => handleEditRef.current(coupon),
        onDelete: (couponId) => handleDeleteRequestRef.current(couponId),
        t,
        dir,
      }),
    [t, dir],
  )

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        {/* Add Filters here if needed */}
        <Button onClick={handleCreateNew} disabled={loading}>
          <PlusCircle className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} /> {t("adminCoupons.createNew")}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={coupons}
        className="overflow-x-auto w-full"
        // pagination (pass pagination state and handlers to DataTable if it supports server-side pagination)
        // For now, assuming DataTable handles its own client-side pagination or you implement server-side pagination controls
        // totalPages={pagination.totalPages}
        // currentPage={pagination.currentPage}
        // onPageChange={(page) => router.push(`/dashboard/admin/coupons?page=${page}`)}
        // loading={loading}
      />
      <p className="text-sm text-muted-foreground mt-2">
        {t("adminCoupons.totalCoupons", { count: pagination.totalCoupons })}
      </p>

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCoupon(null)
          }
          setIsFormOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>
              {editingCoupon ? t("adminCoupons.form.titleEdit") : t("adminCoupons.form.titleCreate")}
            </DialogTitle>
            <DialogDescription>
              {editingCoupon ? t("adminCoupons.form.descriptionEdit") : t("adminCoupons.form.descriptionCreate")}
            </DialogDescription>
          </DialogHeader>
          <CouponForm
            initialData={editingCoupon}
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
            <AlertDialogTitle>{t("adminCoupons.deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("adminCoupons.deleteDialog.description")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? t("adminCoupons.deleteDialog.deletingButton") : t("adminCoupons.deleteDialog.confirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
