"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent } from "@/components/common/ui/card"
import { DataTable } from "@/components/common/ui/data-table"
import type { ICoupon } from "@/lib/db/models/coupon"

interface CouponsClientProps {
  initialCoupons: ICoupon[]
}

export default function CouponsClient({ initialCoupons }: CouponsClientProps) {
  const { t } = useTranslation()
  const [coupons, setCoupons] = useState(initialCoupons)

  useEffect(() => {
    setCoupons(initialCoupons)
  }, [initialCoupons])

  const columns = [
    {
      accessorKey: "code",
      header: t("coupons.fields.code"),
    },
    {
      accessorKey: "discountType",
      header: t("coupons.fields.discountType"),
    },
    {
      accessorKey: "discountValue",
      header: t("coupons.fields.discountValue"),
    },
    {
      accessorKey: "validFrom",
      header: t("coupons.fields.validFrom"),
      cell: ({ row }: any) => {
        const date = new Date(row.getValue("validFrom"))
        return date.toLocaleDateString()
      },
    },
    {
      accessorKey: "validUntil",
      header: t("coupons.fields.validUntil"),
      cell: ({ row }: any) => {
        const date = new Date(row.getValue("validUntil"))
        return date.toLocaleDateString()
      },
    },
    {
      accessorKey: "isActive",
      header: t("coupons.fields.isActive"),
      cell: ({ row }: any) => {
        return row.getValue("isActive") ? t("common.yes") : t("common.no")
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("coupons.title")}</h1>
        <Button>{t("coupons.addNew")}</Button>
      </div>
      <Card>
        <CardContent className="p-2">
          <DataTable columns={columns} data={coupons} searchKey="code" />
        </CardContent>
      </Card>
    </div>
  )
}
