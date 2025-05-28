"use client"

import { useState, useEffect } from "react"
import { useTranslation } from "@/lib/translations/i18n"
import { Button } from "@/components/common/ui/button"
import { Card, CardContent } from "@/components/common/ui/card"
import { DataTable } from "@/components/common/ui/data-table"
import type { IGiftVoucher } from "@/lib/db/models/gift-voucher"

interface GiftVouchersClientProps {
  initialGiftVouchers: IGiftVoucher[]
}

export default function GiftVouchersClient({ initialGiftVouchers }: GiftVouchersClientProps) {
  const { t } = useTranslation()
  const [giftVouchers, setGiftVouchers] = useState(initialGiftVouchers)

  useEffect(() => {
    setGiftVouchers(initialGiftVouchers)
  }, [initialGiftVouchers])

  const columns = [
    {
      accessorKey: "code",
      header: t("giftVouchers.fields.code"),
    },
    {
      accessorKey: "value",
      header: t("giftVouchers.fields.value"),
      cell: ({ row }: any) => {
        const value = Number.parseFloat(row.getValue("value"))
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value)
      },
    },
    {
      accessorKey: "validFrom",
      header: t("giftVouchers.fields.validFrom"),
      cell: ({ row }: any) => {
        const date = new Date(row.getValue("validFrom"))
        return date.toLocaleDateString()
      },
    },
    {
      accessorKey: "validUntil",
      header: t("giftVouchers.fields.validUntil"),
      cell: ({ row }: any) => {
        const date = new Date(row.getValue("validUntil"))
        return date.toLocaleDateString()
      },
    },
    {
      accessorKey: "isActive",
      header: t("giftVouchers.fields.isActive"),
      cell: ({ row }: any) => {
        return row.getValue("isActive") ? t("common.yes") : t("common.no")
      },
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("giftVouchers.title")}</h1>
        <Button>{t("giftVouchers.addNew")}</Button>
      </div>
      <Card>
        <CardContent className="p-2">
          <DataTable columns={columns} data={giftVouchers} searchKey="code" />
        </CardContent>
      </Card>
    </div>
  )
}
