"use client"

import * as React from "react"
import { PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation" // Removed useSearchParams as it's not used
import { Button } from "@/components/common/ui/button"
import { DataTable } from "@/components/common/ui/data-table" // Corrected path
import { useToast } from "@/components/common/ui/use-toast"
import type { ICoupon } from "@/lib/db/models/coupon"
import { CouponForm, type CouponFormValues } from "./coupon-form"
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/app/dashboard/(user)/(roles)/admin/coupons/actions"
import { columns as couponColumnsDefinition } from "./coupons-columns" // Corrected import and aliased
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
import { useIsMobile } from "@/components/common/ui/use-mobile" // Corrected import name
import { CouponCard } from "./coupon-card"

interface CouponsClientProps {
  initialData: Awaited<ReturnType<typeof getAllCoupons>>
  partnersForSelect: { value: string; label: string }[]
}

export default function CouponsClient({ initialData, partnersForSelect }: CouponsClientProps) {
  const router = useRouter()
  const { toast } = useToast()

  // Ensure initialData.coupons is an array, default to empty array if undefined
  const [coupons, setCoupons] = React.useState<Array<ICoupon & { effectiveStatus: string }>>(
    (initialData?.coupons as Array<ICoupon & { effectiveStatus: string }>) || [],
  )
  const [pagination, setPagination] = React.useState({
    totalPages: 1,
    currentPage: 1,
    totalCoupons: initialData?.totalCoupons || 0,
  })
  const [loading, setLoading] = React.useState(false)
  const [isFormOpen, setIsFormOpen] = React.useState(false)
  const [editingCoupon, setEditingCoupon] = React.useState<(ICoupon & { effectiveStatus: string }) | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const [couponToDelete, setCouponToDelete] = React.useState<string | null>(null)

  const { t, dir } = useTranslation()

  const handleCreateNew = () => {
    setEditingCoupon(null)
    setIsFormOpen(true)
  }

  const handleEdit = (coupon: ICoupon & { effectiveStatus: string }) => {
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
        setCoupons((prev) => prev.filter((c) => c._id.toString() !== couponToDelete))
        setPagination((prev) => ({ ...prev, totalCoupons: prev.totalCoupons - 1 }))
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

  const handleFormSubmit = async (_values: CouponFormValues) => {
    setLoading(true)
    try {
      let result
      if (editingCoupon) {
        result = await updateCoupon({ ..._values, id: editingCoupon._id.toString() })
      } else {
        result = await createCoupon(_values)
      }

      if (result.success && result.data) {
        toast({
          title: t("common.success"),
          description: editingCoupon ? t("adminCoupons.toast.updateSuccess") : t("adminCoupons.toast.createSuccess"),
        })
        setIsFormOpen(false)
        setEditingCoupon(null)
        // Instead of router.refresh(), update state directly for better UX
        if (editingCoupon) {
          setCoupons((prev) =>
            prev.map((c) =>
              c._id.toString() === result.data?._id.toString()
                ? (result.data as ICoupon & { effectiveStatus: string })
                : c,
            ),
          )
        } else {
          setCoupons((prev) => [...prev, result.data as ICoupon & { effectiveStatus: string }])
          setPagination((prev) => ({ ...prev, totalCoupons: prev.totalCoupons + 1 }))
        }
        // Force a state refresh by reloading the page after successful operations
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

  // Using refs for handlers passed to memoized columns or child components
  // to prevent re-creation of columns/child components on every render of CouponsClient
  const onEditRef = React.useRef(handleEdit)
  const onDeleteRef = React.useRef(handleDeleteRequest)

  // Update refs if handlers change (though in this case they don't depend on props/state that change them)
  React.useEffect(() => {
    onEditRef.current = handleEdit
    onDeleteRef.current = handleDeleteRequest
  })

  const memoizedColumns = React.useMemo(
    () =>
      couponColumnsDefinition({
        onEdit: (coupon) => onEditRef.current(coupon),
        onDelete: (couponId) => onDeleteRef.current(couponId),
        t,
        dir,
      }),
    [t, dir],
  )

  const isMobile = useIsMobile()

  // Effect to update coupons if initialData changes (e.g., after router.refresh() or navigation)
  React.useEffect(() => {
    setCoupons((initialData?.coupons as Array<ICoupon & { effectiveStatus: string }>) || [])
    setPagination({
      totalPages: 1,
      currentPage: 1,
      totalCoupons: initialData?.totalCoupons || 0,
    })
  }, [initialData])

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <Button onClick={handleCreateNew} disabled={loading}>
          <PlusCircle className={dir === "rtl" ? "ml-2 h-4 w-4" : "mr-2 h-4 w-4"} /> {t("adminCoupons.createNew")}
        </Button>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {coupons.map((coupon) => (
            <CouponCard
              key={coupon._id.toString()}
              coupon={coupon}
              onEdit={onEditRef.current}
              onDelete={onDeleteRef.current}
              t={t}
              dir={dir}
            />
          ))}
          {coupons.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-4">
              {t("adminCoupons.noCouponsFound")}
            </p>
          )}
        </div>
      ) : (
        <>
          <DataTable
            columns={memoizedColumns}
            data={coupons}
            // DataTable does not accept className directly. Styling is via its internal structure or a wrapper.
            // For server-side pagination, you'd pass props like:
            // pageCount={pagination.totalPages}
            // onPageChange={(pageIndex) => router.push(`/dashboard/admin/coupons?page=${pageIndex + 1}`)}
            // manualPagination={true}
            // state={{ pagination: { pageIndex: pagination.currentPage - 1, pageSize: 10 /* or your page size */ } }}
          />
          <p className="text-sm text-muted-foreground mt-2">
            {t("adminCoupons.totalCoupons")}
          </p>
        </>
      )}

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
