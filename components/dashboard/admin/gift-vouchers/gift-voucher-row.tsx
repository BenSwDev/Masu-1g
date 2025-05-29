import { format } from "date-fns"
import { Edit, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { GiftVoucherPlain } from "./gift-voucher-form"

interface GiftVoucherRowProps {
  voucher: GiftVoucherPlain
  onEdit: (voucher: GiftVoucherPlain) => void
  onDelete: (id: string) => void
}

export function GiftVoucherRow({ voucher, onEdit, onDelete }: GiftVoucherRowProps) {
  const now = new Date()
  const validFrom = new Date(voucher.validFrom)
  const validUntil = new Date(voucher.validUntil)

  let status = "Active"
  let statusVariant: "default" | "secondary" | "destructive" | "outline" = "default"

  if (!voucher.isActive) {
    status = "Inactive"
    statusVariant = "secondary"
  } else if (now < validFrom) {
    status = "Pending"
    statusVariant = "outline"
  } else if (now > validUntil) {
    status = "Expired"
    statusVariant = "destructive"
  }

  return (
    <div className="grid grid-cols-6 gap-4 p-4 border-t">
      <div className="font-medium">{voucher.code}</div>
      <div>${voucher.value.toFixed(2)}</div>
      <div>{format(validFrom, "MMM d, yyyy")}</div>
      <div>{format(validUntil, "MMM d, yyyy")}</div>
      <div>
        <Badge variant={statusVariant}>{status}</Badge>
      </div>
      <div className="flex justify-end space-x-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(voucher)}
          title="Edit voucher"
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(voucher._id)}
          title="Delete voucher"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
