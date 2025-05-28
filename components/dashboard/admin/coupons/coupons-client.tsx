"use client"

import { useState } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/common/ui/tabs"
import { Button } from "@/components/common/ui/button"
import { Plus, Search, RefreshCw } from "lucide-react"
import { Input } from "@/components/common/ui/input"
import { DataTable } from "@/components/common/ui/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/common/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/common/ui/dialog"
import { AlertModal } from "@/components/common/modals/alert-modal"
import type { ICoupon } from "@/lib/db/models/coupon"
import { createCoupon, updateCoupon, deleteCoupon, getAllCoupons } from "@/actions/coupon-actions"
import CouponForm from "./coupon-form"
import { toast } from "@/components/common/ui/use-toast"

interface CouponsClientProps {
  initialCoupons: ICoupon[]
  error: string | null
}

export default function CouponsClient({ initialCoupons, error }: CouponsClientProps) {
  const { t } = useTranslation()
  const [coupons, setCoupons] = useState<ICoupon[]>(initialCoupons)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [openCouponForm, setOpenCouponForm] = useState(false)
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false)
  const [selectedCoupon, setSelectedCoupon] = useState<ICoupon | null>(null)
  const [activeTab, setActiveTab] = useState("all")

  // Filter coupons based on search query and active tab
  const filteredCoupons = coupons.filter((coupon) => {
    const matchesSearch =
      coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coupon.description.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeTab === "all") return matchesSearch
    if (activeTab === "active") return matchesSearch && coupon.isActive && !coupon.isExpired
    if (activeTab === "inactive") return matchesSearch && (!coupon.isActive || coupon.isExpired)

    return matchesSearch
  })

  // Refresh coupons list
  const refreshCoupons = async () => {
    setIsLoading(true)
    try {
      const { success, coupons: refreshedCoupons } = await getAllCoupons()
      if (success && refreshedCoupons) {
        setCoupons(refreshedCoupons)
        toast({
          title: t("success"),
          description: t("coupons_refreshed"),
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failed_to_refresh_coupons"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle coupon creation
  const handleCreateCoupon = async (formData: FormData) => {
    setIsLoading(true)
    try {
      const { success, coupon, message } = await createCoupon(formData)

      if (success && coupon) {
        setCoupons((prev) => [coupon, ...prev])
        setOpenCouponForm(false)
        toast({
          title: t("success"),
          description: t("coupon_created"),
        })
      } else {
        toast({
          title: t("error"),
          description: t(message || "failed_to_create_coupon"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failed_to_create_coupon"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle coupon update
  const handleUpdateCoupon = async (formData: FormData) => {
    if (!selectedCoupon) return

    setIsLoading(true)
    try {
      const { success, coupon, message } = await updateCoupon(selectedCoupon._id, formData)

      if (success && coupon) {
        setCoupons((prev) => prev.map((c) => (c._id === coupon._id ? coupon : c)))
        setOpenCouponForm(false)
        setSelectedCoupon(null)
        toast({
          title: t("success"),
          description: t("coupon_updated"),
        })
      } else {
        toast({
          title: t("error"),
          description: t(message || "failed_to_update_coupon"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failed_to_update_coupon"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle coupon deletion
  const handleDeleteCoupon = async () => {
    if (!selectedCoupon) return

    setIsLoading(true)
    try {
      const { success, message } = await deleteCoupon(selectedCoupon._id)

      if (success) {
        setCoupons((prev) => prev.filter((c) => c._id !== selectedCoupon._id))
        setOpenDeleteAlert(false)
        setSelectedCoupon(null)
        toast({
          title: t("success"),
          description: t("coupon_deleted"),
        })
      } else {
        toast({
          title: t("error"),
          description: t(message || "failed_to_delete_coupon"),
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: t("error"),
        description: t("failed_to_delete_coupon"),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Table columns definition
  const columns: ColumnDef<ICoupon>[] = [
    {
      accessorKey: "code",
      header: t("coupon_code"),
    },
    {
      accessorKey: "description",
      header: t("description"),
    },
    {
      accessorKey: "discountValue",
      header: t("discount"),
      cell: ({ row }) => {
        const coupon = row.original
        return coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₪${coupon.discountValue.toFixed(2)}`
      },
    },
    {
      accessorKey: "usage",
      header: t("usage"),
      cell: ({ row }) => {
        const coupon = row.original
        return coupon.maxUses > 0 ? `${coupon.currentUses} / ${coupon.maxUses}` : `${coupon.currentUses} / ∞`
      },
    },
    {
      accessorKey: "startDate",
      header: t("start_date"),
      cell: ({ row }) => {
        return new Date(row.original.startDate).toLocaleDateString()
      },
    },
    {
      accessorKey: "endDate",
      header: t("end_date"),
      cell: ({ row }) => {
        return new Date(row.original.endDate).toLocaleDateString()
      },
    },
    {
      accessorKey: "status",
      header: t("status"),
      cell: ({ row }) => {
        const coupon = row.original
        const isExpired = new Date() > new Date(coupon.endDate)
        const isMaxedOut = coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses

        if (!coupon.isActive) {
          return (
            <Badge variant="outline" className="bg-gray-100">
              {t("inactive")}
            </Badge>
          )
        } else if (isExpired) {
          return (
            <Badge variant="outline" className="bg-red-100">
              {t("expired")}
            </Badge>
          )
        } else if (isMaxedOut) {
          return (
            <Badge variant="outline" className="bg-orange-100">
              {t("maxed_out")}
            </Badge>
          )
        } else {
          return (
            <Badge variant="outline" className="bg-green-100">
              {t("active")}
            </Badge>
          )
        }
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const coupon = row.original

        return (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCoupon(coupon)
                setOpenCouponForm(true)
              }}
            >
              {t("edit")}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={() => {
                setSelectedCoupon(coupon)
                setOpenDeleteAlert(true)
              }}
            >
              {t("delete")}
            </Button>
          </div>
        )
      },
    },
  ]

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("error")}</CardTitle>
          <CardDescription>{t(error)}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("coupons_management")}</CardTitle>
            <CardDescription>{t("manage_discount_coupons")}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshCoupons} disabled={isLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("refresh")}
            </Button>
            <Button
              onClick={() => {
                setSelectedCoupon(null)
                setOpenCouponForm(true)
              }}
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t("create_coupon")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("search_coupons")}
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList className="grid grid-cols-3 w-full sm:w-auto">
                  <TabsTrigger value="all">{t("all")}</TabsTrigger>
                  <TabsTrigger value="active">{t("active")}</TabsTrigger>
                  <TabsTrigger value="inactive">{t("inactive")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <DataTable
              columns={columns}
              data={filteredCoupons}
              searchKey="code"
              searchPlaceholder={t("search_coupons")}
              noDataMessage={t("no_coupons_found")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Coupon Form Dialog */}
      <Dialog open={openCouponForm} onOpenChange={setOpenCouponForm}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{selectedCoupon ? t("edit_coupon") : t("create_coupon")}</DialogTitle>
          </DialogHeader>
          <CouponForm
            coupon={selectedCoupon}
            onSubmit={selectedCoupon ? handleUpdateCoupon : handleCreateCoupon}
            isLoading={isLoading}
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertModal
        isOpen={openDeleteAlert}
        onClose={() => setOpenDeleteAlert(false)}
        onConfirm={handleDeleteCoupon}
        loading={isLoading}
        title={t("delete_coupon")}
        description={t("delete_coupon_confirmation")}
      />
    </>
  )
}
