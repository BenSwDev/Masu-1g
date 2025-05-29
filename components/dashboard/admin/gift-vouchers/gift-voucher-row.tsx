"use client"

import { format } from "date-fns"
import { Edit, Trash2, User, Gift, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { GiftVoucherPlain } from "./gift-voucher-form"

interface GiftVoucherRowProps {
  voucher: GiftVoucherPlain
  onEdit: (voucher: GiftVoucherPlain) => void
  onDelete: (id: string) => void
}

export function GiftVoucherRow({ voucher, onEdit, onDelete }: GiftVoucherRowProps) {
  const now = new Date()
  const validFrom = new Date(voucher.validFrom)
  const validUntil = new Date(voucher.validUntil)

  let status = "פעיל"
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "default"

  if (!voucher.isActive) {
    status = "לא פעיל"
    statusVariant = "secondary"
  } else if (voucher.status === "expired") {
    status = "פג תוקף"
    statusVariant = "destructive"
  } else if (voucher.status === "fully_used") {
    status = "נוצל במלואו"
    statusVariant = "destructive"
  } else if (voucher.status === "partially_used") {
    status = "נוצל חלקית"
    statusVariant = "outline"
  } else if (voucher.status === "pending_payment") {
    status = "ממתין לתשלום"
    statusVariant = "outline"
  } else if (voucher.status === "pending_send") {
    status = "ממתין לשליחה"
    statusVariant = "outline"
  } else if (now < validFrom) {
    status = "ממתין"
    statusVariant = "outline"
  } else if (now > validUntil) {
    status = "פג תוקף"
    statusVariant = "destructive"
  }

  const getVoucherTypeDisplay = () => {
    if (voucher.voucherType === "monetary") {
      return (
        <div className="flex items-center gap-1">
          <CreditCard className="h-4 w-4" />
          <span>כספי</span>
        </div>
      )
    } else {
      return (
        <div className="flex items-center gap-1">
          <Gift className="h-4 w-4" />
          <span>טיפול</span>
        </div>
      )
    }
  }

  const getValueDisplay = () => {
    if (voucher.voucherType === "monetary") {
      return `₪${voucher.remainingAmount.toFixed(2)} / ₪${voucher.monetaryValue.toFixed(2)}`
    } else {
      return `₪${voucher.monetaryValue.toFixed(2)}`
    }
  }

  return (
    <div className="grid grid-cols-9 gap-4 p-4 border-t items-center">
      <div className="font-medium">{voucher.code}</div>
      <div>{getVoucherTypeDisplay()}</div>
      <div className="text-sm">{getValueDisplay()}</div>
      <div className="text-sm">
        {voucher.purchaserUserId ? (
          <div className="flex items-center gap-1">
            <User className="h-3 w-3" />
            <span className="truncate">רוכש</span>
          </div>
        ) : (
          "מנהל"
        )}
      </div>
      <div className="text-sm">
        <div className="flex items-center gap-1">
          <User className="h-3 w-3" />
          <span className="truncate">בעלים</span>
        </div>
      </div>
      <div className="text-sm">
        {voucher.isGift ? (
          <div className="flex items-center gap-1">
            <Gift className="h-3 w-3 text-pink-500" />
            <span>{voucher.recipientName || "מתנה"}</span>
          </div>
        ) : (
          "-"
        )}
      </div>
      <div className="text-sm">{format(validFrom, "dd/MM/yyyy")}</div>
      <div>
        <Badge variant={statusVariant}>{status}</Badge>
      </div>
      <div className="flex justify-end space-x-2">
        <Button variant="ghost" size="icon" onClick={() => onEdit(voucher)} title="ערוך שובר">
          <Edit className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => onDelete(voucher._id)} title="מחק שובר">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
