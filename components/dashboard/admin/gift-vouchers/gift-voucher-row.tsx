"use client"

import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { Button } from "@/components/common/ui/button"
import {
  Edit,
  Trash2,
  UserCircle,
  Tag,
  CalendarDays,
  CircleDollarSign,
} from "lucide-react"
import type { GiftVoucherPlain } from "@/actions/gift-voucher-actions"
import { useTranslation } from "@/lib/translations/i18n"
import { format, parseISO } from "date-fns"

interface GiftVoucherRowProps {
  voucher: GiftVoucherPlain
  onEdit: (voucher: GiftVoucherPlain) => void
  onDelete: (id: string) => void
  onViewDetails?: (voucher: GiftVoucherPlain) => void
}

export function GiftVoucherRow({ voucher, onEdit, onDelete, onViewDetails }: GiftVoucherRowProps) {
  const { t } = useTranslation()

  const validUntil = typeof voucher.validUntil === "string" ? parseISO(voucher.validUntil) : voucher.validUntil
  const purchaseDate = typeof voucher.purchaseDate === "string" ? parseISO(voucher.purchaseDate) : voucher.purchaseDate

  return (
    <Card
      onClick={() => onViewDetails?.(voucher)}
      className="hover:shadow-md transition-all cursor-pointer"
    >
      <CardHeader className="flex justify-between items-start pb-2">
        <div>
          <CardTitle className="text-lg">{voucher.code}</CardTitle>
          {voucher.ownerName && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center">
              <UserCircle className="h-3 w-3 mr-1" />
              {voucher.ownerName}
            </p>
          )}
        </div>
        <Badge variant={voucher.isActive ? "default" : "secondary"}>
          {voucher.isActive ? t("common.active") : t("common.inactive")}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center text-sm">
          {voucher.voucherType === "monetary" ? (
            <CircleDollarSign className="h-4 w-4 mr-1 text-green-600" />
          ) : (
            <Tag className="h-4 w-4 mr-1 text-purple-600" />
          )}
          <span>
            {voucher.voucherType === "monetary"
              ? `${voucher.monetaryValue?.toFixed(2)} ${t("common.currency")}`
              : voucher.treatmentName || ""}
          </span>
        </div>
        <div className="flex items-center text-sm">
          <CalendarDays className="h-4 w-4 mr-1 text-gray-500" />
          {format(purchaseDate, "dd/MM/yy")} - {format(validUntil, "dd/MM/yy")}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 border-t pt-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(voucher)
          }}
        >
          <Edit className="h-4 w-4 mr-1" />
          {t("common.edit")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(voucher._id)
          }}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          {t("common.delete")}
        </Button>
      </CardFooter>
    </Card>
  )
}
