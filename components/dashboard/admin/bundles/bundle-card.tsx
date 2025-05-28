"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/common/ui/card"
import { Button } from "@/components/common/ui/button"
import { Switch } from "@/components/common/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/common/ui/dropdown-menu"
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
import { DiscountType, type IBundle } from "@/lib/db/models/bundle"
import { Package, MoreVertical, Calendar, Gift, Clock, Loader2 } from "lucide-react"

interface BundleCardProps {
  bundle: IBundle
  onEdit: (bundle: IBundle) => void
  onDelete: (id: string) => Promise<boolean>
  onDuplicate: (id: string) => Promise<boolean>
  onToggleStatus: (id: string) => Promise<boolean>
}

export function BundleCard({ bundle, onEdit, onDelete, onDuplicate, onToggleStatus }: BundleCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDuplicating, setIsDuplicating] = useState(false)
  const [isTogglingStatus, setIsTogglingStatus] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const success = await onDelete(bundle._id.toString())
      if (!success) {
        setShowDeleteDialog(false)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true)
    try {
      await onDuplicate(bundle._id.toString())
    } finally {
      setIsDuplicating(false)
    }
  }

  const handleToggleStatus = async () => {
    setIsTogglingStatus(true)
    try {
      await onToggleStatus(bundle._id.toString())
    } finally {
      setIsTogglingStatus(false)
    }
  }

  const formatDiscountValue = () => {
    switch (bundle.discountType) {
      case DiscountType.FREE_QUANTITY:
        return `${bundle.discountValue} טיפולים חינם`
      case DiscountType.PERCENTAGE:
        return `${bundle.discountValue}% הנחה`
      case DiscountType.FIXED_AMOUNT:
        return `₪${bundle.discountValue} הנחה`
      default:
        return ""
    }
  }

  return (
    <>
      <Card className="w-full overflow-hidden border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-0">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center rtl:flex-row-reverse">
                <Package className="w-5 h-5 ml-2 rtl:ml-0 rtl:mr-2 text-teal-500" />
                <h3 className="text-lg font-semibold">{bundle.name}</h3>
              </div>
              <div className="flex items-center">
                <Switch
                  checked={bundle.isActive}
                  onCheckedChange={handleToggleStatus}
                  disabled={isTogglingStatus}
                  className="ml-4 rtl:ml-0 rtl:mr-4 data-[state=checked]:bg-teal-500"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isDeleting || isDuplicating || isTogglingStatus}>
                      {isDeleting || isDuplicating || isTogglingStatus ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MoreVertical className="w-4 h-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(bundle)}>עריכה</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDuplicate} disabled={isDuplicating}>
                      {isDuplicating ? "משכפל..." : "שכפול"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setShowDeleteDialog(true)}
                      className="text-red-600"
                      disabled={isDeleting}
                    >
                      {isDeleting ? "מוחק..." : "מחיקה"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-gray-500 mb-2">קטגוריה: {bundle.category}</div>
              {bundle.description && <p className="text-sm text-gray-700">{bundle.description}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center rtl:flex-row-reverse">
                <Package className="w-4 h-4 ml-2 rtl:ml-0 rtl:mr-2 text-gray-500" />
                <span className="text-sm">{bundle.quantity} טיפולים</span>
              </div>
              <div className="flex items-center rtl:flex-row-reverse">
                <Calendar className="w-4 h-4 ml-2 rtl:ml-0 rtl:mr-2 text-gray-500" />
                <span className="text-sm">תוקף: {bundle.validityMonths} חודשים</span>
              </div>
              <div className="flex items-center rtl:flex-row-reverse">
                <Gift className="w-4 h-4 ml-2 rtl:ml-0 rtl:mr-2 text-gray-500" />
                <span className="text-sm">{formatDiscountValue()}</span>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2">טיפולים זמינים:</h4>
              <div className="space-y-1">
                {Array.isArray(bundle.treatments) && bundle.treatments.length > 0 ? (
                  bundle.treatments.map((treatment, index) => (
                    <div className="flex items-center text-sm rtl:flex-row-reverse" key={index}>
                      <Clock className="w-3 h-3 ml-1 rtl:ml-0 rtl:mr-1 text-gray-400" />
                      {treatment.name}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-gray-500">אין טיפולים זמינים</div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="max-w-md mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח שברצונך למחוק חבילה זו?</AlertDialogTitle>
            <AlertDialogDescription>פעולה זו לא ניתנת לביטול. חבילה זו תימחק לצמיתות מהמערכת.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse sm:justify-end rtl:flex-row rtl:sm:justify-start">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4 animate-spin" />
                  מוחק...
                </>
              ) : (
                "מחק"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
