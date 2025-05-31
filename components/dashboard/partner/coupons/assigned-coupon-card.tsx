"use client"

import type { ICoupon } from "@/lib/db/models/coupon"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/common/ui/card"
import { Badge } from "@/components/common/ui/badge"
import { formatDate, formatCurrency } from "@/lib/utils/utils" // Assuming you have these utils
import { CheckCircle, XCircle, Info, Copy } from "lucide-react"
import { useToast } from "@/components/common/ui/use-toast"
import { Button } from "@/components/common/ui/button"

interface AssignedCouponCardProps {
  coupon: ICoupon
}

export default function AssignedCouponCard({ coupon }: AssignedCouponCardProps) {
  const { toast } = useToast()

  const handleCopyCode = () => {
    navigator.clipboard
      .writeText(coupon.code)
      .then(() => {
        toast({ title: "Copied!", description: `Coupon code "${coupon.code}" copied to clipboard.` })
      })
      .catch((err) => {
        toast({ title: "Error", description: "Failed to copy code.", variant: "destructive" })
      })
  }

  // Determine if coupon is currently valid based on dates and isActive flag
  const now = new Date()
  const isDateValid = coupon.validFrom <= now && coupon.validUntil >= now
  const isEffectivelyActive = coupon.isActive && isDateValid

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg">{coupon.code}</CardTitle>
          <Button variant="ghost" size="sm" onClick={handleCopyCode} aria-label="Copy coupon code">
            <Copy className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription className="text-xs">{coupon.description || "No description"}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3 text-sm">
        <div className="flex justify-between">
          <span>Discount:</span>
          <span className="font-semibold">
            {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : formatCurrency(coupon.discountValue)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Valid:</span>
          <span className="font-semibold">
            {formatDate(coupon.validFrom)} - {formatDate(coupon.validUntil)}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span>Status:</span>
          {isEffectivelyActive ? (
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-xs">
              <CheckCircle className="mr-1 h-3 w-3" /> Active
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              <XCircle className="mr-1 h-3 w-3" /> Inactive/Expired
            </Badge>
          )}
        </div>
        <div className="flex justify-between">
          <span>Total Uses:</span>
          <span className="font-semibold">
            {coupon.timesUsed} / {coupon.usageLimit === 0 ? "Unlimited" : coupon.usageLimit}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Uses Per Customer:</span>
          <span className="font-semibold">
            {coupon.usageLimitPerUser === 0 ? "Unlimited" : coupon.usageLimitPerUser}
          </span>
        </div>
        {coupon.notesForPartner && (
          <div className="pt-2">
            <p className="text-xs font-semibold text-muted-foreground flex items-center">
              <Info className="h-3 w-3 mr-1 text-sky-600" /> Admin Note:
            </p>
            <p className="text-xs text-muted-foreground pl-1 bg-slate-50 dark:bg-slate-800 p-2 rounded-md">
              {coupon.notesForPartner}
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">Created: {formatDate(coupon.createdAt as Date)}</CardFooter>
    </Card>
  )
}
